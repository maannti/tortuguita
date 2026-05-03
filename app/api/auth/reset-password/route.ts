import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { createHash } from "crypto";
import { z } from "zod";
import {
  clientIdFromRequest,
  limiters,
  rateLimitOrError,
} from "@/lib/rate-limit";

const resetSchema = z.object({
  token: z.string().min(10).max(256),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

export async function POST(request: Request) {
  try {
    const limited = rateLimitOrError(
      clientIdFromRequest(request),
      limiters.resetPassword,
    );
    if (limited) return limited;

    const body = await request.json();
    const { token, password } = resetSchema.parse(body);

    // We store SHA-256(token) in DB, so we hash the incoming plaintext token
    // and look up by hash.
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: tokenHash },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (resetToken.expires < new Date()) {
      // Delete expired token
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      });

      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: resetToken.email },
    });

    if (!user) {
      // Clean up the orphan token to avoid future failed lookups.
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      });
      // Same generic error to avoid leaking that the account no longer exists.
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await hash(password, 12);

    // Atomically update the password and invalidate the token (and any other
    // outstanding reset tokens for this email).
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { email: resetToken.email },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
