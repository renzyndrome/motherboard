import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const OppositeRoleUsersPage = () => {
    const { token, user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (!token || !user) {
            navigate('/login');
            return;
        }

        fetchSuggestions();
    }, [token, user]);

    const fetchSuggestions = async () => {
        try {
            const response = await fetch(`http://localhost:8000/users/suggested-matches`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('API Error:', error);
                throw new Error(error.detail || 'Failed to fetch suggestions');
            }

            const data = await response.json();
            console.log('Fetched suggestions:', data);
            setUsers(data);
        } catch (error) {
            console.error('Error fetching suggestions:', error.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-xl font-semibold">Loading suggestions...</div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">
                Suggested Matches Based on {user.role === 'Disciple' ? 'Discipler' : 'Disciple'} Preferences
            </h1>
            {users.length === 0 ? (
                <p className="text-center text-gray-500">No suggestions found.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {users.map((u) => (
                        <div key={u.id} className="bg-white p-4 rounded-lg shadow">
                            <h3 className="font-semibold text-lg">{u.name}</h3>
                            <p className="text-gray-600">Email: {u.email}</p>
                            <p className="text-gray-600">Location: {u.location}</p>
                            <p className="text-gray-600">Common Interests: {u.common_interests.join(', ') || 'None'}</p>
                            <p className="text-gray-600">
                                Age Range: {u.within_age_range ? 'Similar' : 'Different'}
                            </p>
                            <p className="text-gray-600">Same Location: {u.same_location ? 'Yes' : 'No'}</p>
                            <p className="text-gray-600 font-bold">Match Score: {u.match_score}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OppositeRoleUsersPage;
