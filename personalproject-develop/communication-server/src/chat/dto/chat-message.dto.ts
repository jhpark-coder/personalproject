export type ChatMessageType = 'CHAT' | 'JOIN' | 'LEAVE';

export class ChatMessageDto {
    sender: string;
    content: string;
    type: ChatMessageType;
    recipient?: string | null;
    timestamp?: Date;
}

export class ChatUserDto {
    sender: string;
    type: ChatMessageType;
} 