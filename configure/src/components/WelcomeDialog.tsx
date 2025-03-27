import React, { useState, useEffect } from 'react';

const WelcomeDialog = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const hasSeenDialog = localStorage.getItem('welcomeDialogShown');
        if (!hasSeenDialog) {
            setIsOpen(true);
        }
    }, []);

    const closeDialog = () => {
        setIsOpen(false);
        localStorage.setItem('welcomeDialogShown', 'true');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="fixed inset-0 bg-black opacity-50"></div>
            <div className="bg-gray-900 text-white p-4 sm:p-8 rounded-lg shadow-2xl transform transition duration-300 ease-out animate-popup z-50 max-w-lg w-full max-h-screen overflow-y-auto">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-purple-400 mb-4 sm:mb-6 text-center">
                    Welcome to FilmWhisper!
                </h2>
                <div className="space-y-4">
                    <p>
                        <span className="font-semibold">FilmWhisper</span> is an innovative add-on for Stremio that empowers you to search using natural language. Instead of limiting you to show or actor names, you can explore content by <span className="underline">events</span>, <span className="underline">locations</span>, or even <span className="underline">plot details</span>.
                    </p>
                    <p>
                        <span className="font-semibold">Try it out:</span> Search for <span className="italic">"Movies shot in New York City"</span> or <span className="italic">"That movie where the parents leave their young son home on vacation"</span> and let our AI uncover the best matches for you!
                    </p>
                    <div>
                        <p className="font-semibold">Language Support:</p>
                        <ul className="list-disc ml-5">
                            <li>Supports all languages.</li>
                            <li>Displays descriptions and posters in your search language when available.</li>
                            <li>Falls back to English if necessary.</li>
                        </ul>
                    </div>
                    <p>
                        Please note: This add-on relies on a Large Language Model (LLM) of your choice, so results may vary.
                    </p>
                    <p>
                        No API key for an LLM? We offer <span className="font-semibold">Gemini</span> for free! Just click <span className="font-semibold">"Generate Manifest"</span> in the top-right corner, and we’ll automatically handle the keys for you.
                    </p>
                    <p>
                        Enjoy your experience with FilmWhisper! If you encounter any issues, feel free to open an issue on our GitHub page.
                    </p>
                </div>
                <div className="mt-6 flex justify-center">
                    <button
                        type="button"
                        onClick={closeDialog}
                        className="px-4 py-2 sm:px-6 sm:py-2 bg-purple-600 hover:bg-purple-700 rounded transition duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                        Got it!
                    </button>
                </div>
            </div>
        </div>
    );
    
};

export default WelcomeDialog;
