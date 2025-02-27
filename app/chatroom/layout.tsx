import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blaze | Chatroom",
  description: "Chat with other users in the Blaze chatroom. Tip others to earn points and climb the ranks.",
  openGraph: {
    title: "Blaze | Chatroom",
    description: "Chat with other users in the Blaze chatroom. Tip others to earn points and climb the ranks.",
    type: "website",
    images: [
      {
        url: "/chatroom.png",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function ChatroomLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {children}
    </html>
  );
}

