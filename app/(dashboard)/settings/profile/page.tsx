import { auth } from "@/lib/auth";
import { ProfileContent } from "@/components/settings/profile-content";

export default async function ProfileSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    return <div>Unauthorized</div>;
  }

  return (
    <ProfileContent
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
    />
  );
}
