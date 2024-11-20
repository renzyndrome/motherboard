import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const BoardList = () => {
    const [loading, setLoading] = useState(true);
    const [boards, setBoards] = useState([]);
    const [newBoardTitle, setNewBoardTitle] = useState('');
    const { user, token, logout } = useAuth(); // Include logout from AuthContext
    const navigate = useNavigate();

    useEffect(() => {
        if (user && token) {  // Check for both user and token
            fetchBoards();
        } else if (!token) {
            navigate('/login');
        }
    }, [user, token]);

    const fetchBoards = async () => {
        try {
            const response = await fetch('http://localhost:8000/boards', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            if (response.status === 401) {
                navigate('/login');
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch boards');
            }

            const data = await response.json();
            setBoards(data);
        } catch (error) {
            console.error('Error fetching boards:', error);
        } finally {
            setLoading(false);
        }
    };

    const createBoard = async () => {
        if (!newBoardTitle.trim()) return;

        try {
            const response = await fetch('http://localhost:8000/boards', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: newBoardTitle,
                    user_id: user.id,
                }),
            });

            if (response.ok) {
                await fetchBoards(); // Refresh the list after creating
                setNewBoardTitle('');
            }
        } catch (error) {
            console.error('Error creating board:', error);
        }
    };

    const handleLogout = () => {
        logout(); // Clear user and token from context
        navigate('/login'); // Redirect to login page
    };

    if (!user) {
        return null; // or redirect to login
    }

    return (
        <div className="p-6">
            {loading ? (
                <div className="flex items-center justify-center h-screen">
                    <div className="text-xl font-semibold">Loading your boards...</div>
                </div>
            ) : (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold">Your Boards</h1>
                        <Link to="/users/opposite-role">Find your match</Link>
                        <button
                            onClick={handleLogout}
                            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                    <div className="mb-6">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newBoardTitle}
                                onChange={(e) => setNewBoardTitle(e.target.value)}
                                placeholder="Enter board title..."
                                className="border p-2 rounded"
                            />
                            <button
                                onClick={createBoard}
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                            >
                                Create Board
                            </button>
                        </div>
                    </div>
                    {boards.length === 0 ? (
                        <div className="text-center py-12">
                            <h2 className="text-xl font-semibold text-gray-600 mb-4">
                                Welcome to Your Spiritual Journey!
                            </h2>
                            <p className="text-gray-500 mb-6">
                                Get started by creating your first board
                            </p>
                            <div className="animate-bounce">↑</div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {boards.map((board) => (
                                <div
                                    key={board.id}
                                    onClick={() => navigate(`/board/${board.id}`)}
                                    className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md"
                                >
                                    <h3 className="font-semibold mb-2">{board.title}</h3>
                                    <div className="text-sm text-gray-600">
                                        <p>{board.stage_count} stages</p>
                                        <p>{board.item_count} items</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default BoardList;
