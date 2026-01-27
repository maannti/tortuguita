import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { randomBytes } from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    console.log("Password reset requested for:", email);

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, language: true },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      console.log("User not found:", email);
      return NextResponse.json({ success: true });
    }

    const isSpanish = user.language === "es";
    console.log("User found, sending reset email to:", email, "language:", user.language);

    // Delete any existing reset tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email },
    });

    // Generate a secure token
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hour from now

    // Store the token
    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expires,
      },
    });

    // Generate reset URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // Email content based on user's language
    const emailContent = isSpanish
      ? {
          subject: "Restablecer contraseña - Tortuguita",
          title: "Restablecer Contraseña",
          body: "Solicitaste restablecer la contraseña de tu cuenta de Tortuguita. Haz clic en el botón para crear una nueva contraseña:",
          button: "Restablecer Contraseña",
          expiry: "Este enlace expirará en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.",
          fallback: "Si el botón no funciona, copia y pega este enlace:",
        }
      : {
          subject: "Reset your password - Tortuguita",
          title: "Reset Your Password",
          body: "You requested a password reset for your Tortuguita account. Click the button below to create a new password:",
          button: "Reset Password",
          expiry: "This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.",
          fallback: "If the button doesn't work, copy and paste this link:",
        };

    // Send email with Resend
    const { data, error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: email,
      subject: emailContent.subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
            <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1a1a1a; font-size: 24px; margin: 0;">${emailContent.title}</h1>
              </div>

              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                ${emailContent.body}
              </p>

              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${resetUrl}" style="display: inline-block; background-color: #4a7c59; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-weight: 600; font-size: 16px;">
                  ${emailContent.button}
                </a>
              </div>

              <p style="color: #888888; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
                ${emailContent.expiry}
              </p>

              <hr style="border: none; border-top: 1px solid #eaeaea; margin: 24px 0;">

              <p style="color: #888888; font-size: 12px; text-align: center; margin: 0;">
                ${emailContent.fallback}<br>
                <a href="${resetUrl}" style="color: #4a7c59; word-break: break-all;">${resetUrl}</a>
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    console.log("Email sent successfully:", data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
