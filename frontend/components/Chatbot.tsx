import React, { useState, useRef, useEffect } from 'react';

interface ChatbotProps {
    onSendMessage: (query: string) => Promise<string>;
}

interface Message {
    text: string;
    sender: 'user' | 'bot';
}

const Chatbot: React.FC<ChatbotProps> = ({ onSendMessage }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { sender: 'bot', text: "Hello! How can I help? You can ask for the status of a report by its ID (e.g., 'Status of 5aBcDeF6gHiJkL7mNoPq')." }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleToggle = () => setIsOpen(!isOpen);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim() === '') return;

        const userMessage: Message = { text: inputValue, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = inputValue;
        setInputValue('');
        setIsTyping(true);

        const botResponseText = await onSendMessage(currentInput);
        const botMessage: Message = { text: botResponseText, sender: 'bot' };
        setMessages(prev => [...prev, botMessage]);
        setIsTyping(false);
    };

    return (
        <>
            <button
                onClick={handleToggle}
                className="fixed bottom-6 right-6 bg-brand-blue text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue z-20"
                aria-label="Toggle chatbot"
            >
                {isOpen ? (
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                )}
            </button>

            {isOpen && (
                <div className="fixed bottom-24 right-6 w-80 md:w-96 h-[28rem] bg-white rounded-lg shadow-2xl flex flex-col z-20 transition-opacity duration-300 animate-fade-in-up">
                    <header className="bg-brand-blue text-white p-4 rounded-t-lg">
                        <h3 className="font-bold text-lg">City Helper Bot</h3>
                    </header>
                    <main className="flex-1 p-4 overflow-y-auto bg-gray-50">
                        <div className="space-y-4">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.sender === 'bot' && <div className="w-8 h-8 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold text-sm flex-shrink-0">AI</div>}
                                    <div className={`px-4 py-2 rounded-lg max-w-xs ${msg.sender === 'user' ? 'bg-brand-lightblue text-white rounded-br-none' : 'bg-gray-200 text-brand-dark rounded-bl-none'}`}>
                                        <p className="text-sm">{msg.text}</p>
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex items-end gap-2 justify-start">
                                    <div className="w-8 h-8 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold text-sm flex-shrink-0">AI</div>
                                    <div className="px-4 py-2 rounded-lg bg-gray-200 text-brand-dark rounded-bl-none">
                                        <div className="flex items-center justify-center space-x-1">
                                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </main>
                    <footer className="p-2 border-t border-gray-200">
                        <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={handleInputChange}
                                placeholder="Type your message..."
                                className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm"
                            />
                            <button type="submit" className="bg-brand-blue text-white p-2 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                            </button>
                        </form>
                    </footer>
                </div>
            )}
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.3s ease-out forwards;
                }
            `}</style>
        </>
    );
};

export default Chatbot;