const MASTER_PASSWORD = 'Room1234';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const apiKey = process.env.DAILY_API_KEY;
    if (!apiKey) {
        res.status(500).json({ error: 'Daily API key not configured' });
        return;
    }

    const { roomName, password } = req.body || {};
    
    if (!roomName) {
        res.status(400).json({ error: 'Room name required' });
        return;
    }

    if (!password || password !== MASTER_PASSWORD) {
        res.status(401).json({ error: 'Invalid password' });
        return;
    }

    try {
        const response = await fetch('https://api.daily.co/v1/meeting-tokens', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                properties: {
                    room_name: roomName,
                    user_name: 'Guest'
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            res.status(500).json({ error: 'Token creation failed', details: errorText });
            return;
        }

        const data = await response.json();
        res.status(200).json({ token: data.token });
    } catch (error) {
        res.status(500).json({ error: 'Token creation error' });
    }
}
