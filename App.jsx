import React, { useState, useCallback, useEffect } from 'react';

// --- Helper Components ---

const RetroButton = ({ children, onClick, disabled = false, className = '' }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`px-6 py-3 bg-indigo-600 text-white font-bold rounded-md shadow-lg
                    hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed
                    transition-all duration-200 ease-in-out transform hover:scale-105
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                    border-2 border-indigo-800 ${className}`}
        style={{ fontFamily: "'Press Start 2P', cursive" }}
    >
        {children}
    </button>
);

const RetroInput = ({ value, onChange, placeholder, className = '' }) => (
    <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full p-3 bg-gray-700 text-white rounded-md border-2 border-gray-600
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                    placeholder-gray-400 ${className}`}
        style={{ fontFamily: "'Press Start 2P', cursive" }}
    />
);

const PlayerCard = ({ card }) => {
    const handleDownload = (e) => {
        e.preventDefault(); // Prevent the default browser action
        const link = document.createElement('a');
        link.href = card.imageUrl;
        link.download = `player-${card.playerNumber}-${card.name.toLowerCase().replace(/\s+/g, '-')}.jpeg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg border-4 border-indigo-500 shadow-2xl transition-transform duration-300 hover:scale-105 flex flex-col">
            <h3 className="text-xl text-yellow-400 mb-2" style={{ fontFamily: "'Press Start 2P', cursive" }}>{`P${card.playerNumber}: ${card.name}`}</h3>
            <img src={card.imageUrl} alt={`Player card for ${card.name}`} className="w-full rounded-md mb-4 border-2 border-gray-600" />
            <div className="space-y-2 flex-grow">
                {card.abilities.map((ability, index) => (
                    <p key={index} className="text-sm text-gray-300"><span className="text-cyan-400 font-bold">{`ABIL ${index + 1}:`}</span> {ability}</p>
                ))}
            </div>
            <div className="mt-4 text-center">
                 <RetroButton onClick={handleDownload} className="w-full text-sm py-2">Download</RetroButton>
            </div>
        </div>
    );
};


// --- Main App Component ---

export default function App() {
    // --- State Management ---
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState('');
    const [generatedCards, setGeneratedCards] = useState([]);
    const [characterName, setCharacterName] = useState('');
    const [ability1, setAbility1] = useState('');
    const [ability2, setAbility2] = useState('');
    const [ability3, setAbility3] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [playerCounter, setPlayerCounter] = useState(1);
    const [error, setError] = useState(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [generatedSprite, setGeneratedSprite] = useState(null); // Holds the result of the first API call

    // --- Handlers ---
    const processFile = useCallback((file) => {
        if (file && file.type.startsWith('image/')) {
            setError(null);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(URL.createObjectURL(file));
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result.split(',')[1];
                setSelectedImage(base64String);
            };
            reader.readAsDataURL(file);
        } else {
            setError("Invalid file. Please upload an image.");
        }
    }, [previewUrl]);

    const handleImageUpload = useCallback((event) => {
        const file = event.target.files[0];
        if (file) processFile(file);
    }, [processFile]);

    const handleDragOver = useCallback((event) => {
        event.preventDefault();
        setIsDraggingOver(true);
    }, []);

    const handleDragLeave = useCallback((event) => {
        event.preventDefault();
        setIsDraggingOver(false);
    }, []);

    const handleDrop = useCallback((event) => {
        event.preventDefault();
        setIsDraggingOver(false);
        const file = event.dataTransfer.files[0];
        if (file) processFile(file);
    }, [processFile]);

    // --- API Call Logic ---

    // Effect triggers Step 2 when a character sprite is successfully generated
    useEffect(() => {
        const buildFinalCard = async () => {
            if (!generatedSprite) return;

            setLoadingStep('Building Card...');
            
            const cardPrompt = `
                **ROLE: You are an 8-bit sprite artist for a classic 1980s console game. Your reputation is on the line.**
                **TASK: You have been given a pre-made character sprite. Your job is to build a player card around it.**

                **STYLE GUIDE (MANDATORY):**
                1.  **Place Character:** Place the provided character sprite in the center of the image.
                2.  **Card Border:** Create an ornate, decorative border around the character using a palette of gold, deep purple, and royal blue pixels in a complex, repeating pattern.
                3.  **Background:** Behind the character sprite, create a simple pixel art landscape: light blue sky with fluffy white clouds, and rolling green hills.
                4.  **UI Panels & Typography:** Below the character, create a dark purple rectangular area for stats. All text must use a chunky, 8-bit style pixel font.
                
                **CARD CONTENT (Integrate into the design):**
                -   Player Number: "Player No.: ${playerCounter}"
                -   Level: "Level: 7"
                -   Character Name: "${characterName}"
                -   XP Bar: A horizontal bar, mostly filled green (950/1000 XP). Label it "XP" and "LEVEL UP!".
                -   Special Abilities: A list titled "SPECIAL ABILITIES": 1. ${ability1}, 2. ${ability2}, 3. ${ability3}.
            `;

            const payload = {
                contents: [{ parts: [ { text: cardPrompt }, { inlineData: { mimeType: "image/png", data: generatedSprite } } ] }],
                generationConfig: { responseModalities: ['IMAGE'] },
            };

            try {
                const apiKey = "";
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error(`API Error (Card): ${response.status}`);
                const result = await response.json();
                const base64Data = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

                if (base64Data) {
                    const imageUrl = `data:image/png;base64,${base64Data}`;
                    const newCard = {
                        imageUrl,
                        name: characterName,
                        abilities: [ability1, ability2, ability3],
                        playerNumber: playerCounter,
                    };
                    setGeneratedCards(prevCards => [newCard, ...prevCards]);
                    setPlayerCounter(prev => prev + 1);
                    // Final reset
                    setCharacterName(''); setAbility1(''); setAbility2(''); setAbility3(''); setSelectedImage(null); setPreviewUrl(null); if (previewUrl) URL.revokeObjectURL(previewUrl);
                } else {
                    throw new Error(result?.candidates?.[0]?.finishReason || "No card data received.");
                }
            } catch (err) {
                console.error(err);
                setError(err.message || "Failed to build the final card.");
            } finally {
                setIsLoading(false);
                setLoadingStep('');
                setGeneratedSprite(null); // Clear the sprite for the next run
            }
        };

        buildFinalCard();
    }, [generatedSprite, characterName, ability1, ability2, ability3, playerCounter, previewUrl]);


    // Starts Step 1: Generating the character sprite
    const startGenerationProcess = useCallback(async () => {
        if (!selectedImage || !characterName || !ability1 || !ability2 || !ability3) {
            setError("Please fill in all fields and upload an image.");
            return;
        }
        setError(null);
        setIsLoading(true);
        setLoadingStep('Generating Character...');

        const spritePrompt = `
            **ROLE: You are an 8-bit sprite artist for a classic 1980s console game. Your reputation is on the line.**
            **TASK: Create a brand new piece of art. The photograph is your only reference for the subject's appearance.**
            
            **ABSOLUTE RULES - FAILURE TO COMPLY IS NOT AN OPTION:**
            1.  **NO FILTERS:** Under no circumstances are you to use the original photo's pixels. Any form of filtering, tracing, rotoscoping, or pixelating the source image is strictly forbidden.
            2.  **REDRAW FROM SCRATCH:** You must create a new drawing, pixel by pixel.
            3.  **8-BIT AESTHETIC:** The style must be authentic 8-bit. This means a limited color palette (like a classic Nintendo Entertainment System game), hard-edged pixels, no anti-aliasing, and simple, blocky shading.
            4.  **REFERENCE, NOT A BASE:** Use the photo to understand the person's hair, clothes, and pose, then discard it and draw your own interpretation in the 8-bit style.
            5.  **OUTPUT FORMAT:** The final image must be ONLY the character sprite on a transparent background. No background, no borders, no text, nothing else. Just the character.
        `;
        
        const payload = {
            contents: [{ parts: [ { text: spritePrompt }, { inlineData: { mimeType: "image/jpeg", data: selectedImage } } ] }],
            generationConfig: { responseModalities: ['IMAGE'] },
        };

        try {
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`API Error (Sprite): ${response.status}`);
            const result = await response.json();
            const base64Data = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

            if (base64Data) {
                setGeneratedSprite(base64Data); // This triggers the useEffect for Step 2
            } else {
                throw new Error(result?.candidates?.[0]?.finishReason || "No sprite data received.");
            }
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to generate the character sprite.");
            setIsLoading(false);
            setLoadingStep('');
        }
    }, [selectedImage, characterName, ability1, ability2, ability3]);

    // --- Render ---
    return (
        <>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}</style>
            <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                <div className="max-w-7xl mx-auto">
                    <header className="text-center mb-10">
                        <h1 className="text-3xl sm:text-5xl font-bold text-yellow-400 tracking-wider">Pixel Player Card</h1>
                        <h2 className="text-lg sm:text-2xl text-indigo-400 mt-2">Generator</h2>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="bg-gray-800 p-6 sm:p-8 rounded-lg border-4 border-indigo-700 shadow-2xl">
                            <h3 className="text-2xl mb-6 text-cyan-400">Create New Player</h3>
                            <div className="space-y-6">
                                <div>
                                    <label htmlFor="file-upload" className="block text-sm font-medium mb-2">1. Upload Photo</label>
                                    <input id="file-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                    <label 
                                        htmlFor="file-upload" 
                                        className={`w-full cursor-pointer bg-gray-700 rounded-md border-2 border-dashed hover:border-indigo-500 transition-all duration-300 flex flex-col items-center justify-center h-48 text-gray-400
                                        ${isDraggingOver ? 'border-yellow-400 bg-gray-600 scale-105' : 'border-gray-500'}`}
                                        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                        <p>{previewUrl ? 'Change Image' : 'Select Image or Drag & Drop'}</p>
                                    </label>
                                    {previewUrl && <div className="mt-4"><img src={previewUrl} alt="Preview" className="w-48 h-48 object-cover mx-auto rounded-lg border-2 border-gray-600" /></div>}
                                </div>
                                <RetroInput value={characterName} onChange={(e) => setCharacterName(e.target.value)} placeholder="2. Enter Character Name" />
                                <RetroInput value={ability1} onChange={(e) => setAbility1(e.target.value)} placeholder="3. Special Ability 1" />
                                <RetroInput value={ability2} onChange={(e) => setAbility2(e.target.value)} placeholder="4. Special Ability 2" />
                                <RetroInput value={ability3} onChange={(e) => setAbility3(e.target.value)} placeholder="5. Special Ability 3" />
                                <div className="text-center pt-4">
                                    <RetroButton onClick={startGenerationProcess} disabled={isLoading || !selectedImage}>
                                        {isLoading ? 'Generating...' : 'Generate Card'}
                                    </RetroButton>
                                </div>
                                {error && <p className="text-red-500 text-center mt-4 text-xs">{error}</p>}
                            </div>
                        </div>
                        <div className="bg-gray-800 p-6 sm:p-8 rounded-lg border-4 border-indigo-700 min-h-[500px]">
                             <h3 className="text-2xl mb-6 text-cyan-400">Generated Cards</h3>
                             {isLoading && (
                                 <div className="flex flex-col items-center justify-center h-full">
                                    <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-yellow-400"></div>
                                    <p className="mt-4 text-lg">{loadingStep}</p>
                                 </div>
                             )}
                            {!isLoading && generatedCards.length === 0 && (
                                <div className="flex items-center justify-center h-full text-center text-gray-400">
                                    <p>Your generated player cards will appear here!</p>
                                </div>
                            )}
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {generatedCards.map(card => <PlayerCard key={card.playerNumber} card={card} />)}
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}


