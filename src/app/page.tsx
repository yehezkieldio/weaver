import { ChatInterface } from "@/components/chat/chat-interface";

export default function ChatPage() {
    return (
        <div className="flex h-screen bg-background">
            <main className="flex flex-1 flex-col overflow-hidden font-sans">
                <ChatInterface />
            </main>
        </div>
    );
}
