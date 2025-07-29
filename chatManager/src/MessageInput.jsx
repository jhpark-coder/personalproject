import React from 'react';
import './MessageInput.css';

const MessageInput = ({
    value,
    onChange,
    onSend,
    onKeyPress,
    disabled,
    placeholder
}) => {
    return (
        <div className="chat-input">
            <div className="input-group">
                <input
                    type="text"
                    className="form-control"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyPress={onKeyPress}
                    placeholder={placeholder}
                    disabled={disabled}
                />
                <button
                    className="btn btn-primary send-button"
                    onClick={onSend}
                    disabled={disabled || !value.trim()}
                >
                    <i className="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
    );
};

export default MessageInput; 