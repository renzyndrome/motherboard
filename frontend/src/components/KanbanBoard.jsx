import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import ItemDetailModal from './ItemDetailModal';
import { useNavigate } from "react-router-dom";

const KanbanBoard = () => {
    const { boardId } = useParams();
    const { token, logout } = useAuth();
    const navigate = useNavigate();
    const [stages, setStages] = useState({});
    const [newItemText, setNewItemText] = useState('');
    const [addingToStage, setAddingToStage] = useState(null);
    const [isCreatingStage, setIsCreatingStage] = useState(false);
    const [newStageTitle, setNewStageTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);

    useEffect(() => {
        if (boardId && token) {
            fetchBoard();
        }
    }, [boardId, token]);

    const fetchBoard = async () => {
        try {
            const response = await fetch(`http://localhost:8000/boards/${boardId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch board');
            }

            const data = await response.json();
            if (data.stages) {
                // Sort stages by position or created_at
                const sortedStages = Object.entries(data.stages)
                    .sort(([, a], [, b]) => {
                        // First try to sort by position
                        if (a.position !== b.position) {
                            return a.position - b.position;
                        }
                        // If positions are equal or not available, sort by created_at
                        return new Date(a.created_at) - new Date(b.created_at);
                    })
                    .reduce((acc, [key, value]) => {
                        acc[key] = value;
                        return acc;
                    }, {});

                setStages(sortedStages);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching board:', error);
            setLoading(false);
        }
    };

    const handleCreateStage = async () => {
        if (!newStageTitle.trim()) return;
        const stageId = newStageTitle.toLowerCase().replace(/\s+/g, '-');

        try {
            const response = await fetch(`http://localhost:8000/boards/${boardId}/stages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: stageId,
                    title: newStageTitle,
                    board_id: boardId
                }),
            });

            if (response.ok) {
                await fetchBoard();  // Refresh the board after creating a stage
                setNewStageTitle('');
                setIsCreatingStage(false);
            }
        } catch (error) {
            console.error('Error creating stage:', error);
        }
    };

    const handleDeleteStage = async (stageId) => {
        try {
            const response = await fetch(`http://localhost:8000/boards/${boardId}/stages/${stageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                await fetchBoard();  // Refresh the board after deleting a stage
            }
        } catch (error) {
            console.error('Error deleting stage:', error);
        }
    };

    const handleItemUpdate = async (updatedItem) => {
        try {
            const response = await fetch(`http://localhost:8000/boards/${boardId}/items/${updatedItem.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedItem),
            });

            if (response.ok) {
                setStages(prevStages => ({
                    ...prevStages,
                    [updatedItem.stage_id]: {
                        ...prevStages[updatedItem.stage_id],
                        items: prevStages[updatedItem.stage_id].items.map(item =>
                            item.id === updatedItem.id ? updatedItem : item
                        )
                    }
                }));
            }
        } catch (error) {
            console.error('Error updating item:', error);
        }
    };

    // Add drag and drop handlers
    const handleDragStart = (e, stageId, item) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({
            itemId: item.id,
            sourceStageId: stageId
        }));
        e.target.classList.add('opacity-50');
    };

    const handleDragEnd = (e) => {
        e.target.classList.remove('opacity-50');
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e, targetStageId) => {
        e.preventDefault();
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        const { itemId, sourceStageId } = data;

        if (sourceStageId === targetStageId) return;

        const item = stages[sourceStageId].items.find(item => item.id === itemId);
        if (!item) return;

        try {
            const response = await fetch(`http://localhost:8000/boards/${boardId}/items/${itemId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...item,
                    stage_id: targetStageId,
                }),
            });

            if (response.ok) {
                const newStages = { ...stages };
                newStages[sourceStageId].items = newStages[sourceStageId].items.filter(item => item.id !== itemId);
                newStages[targetStageId].items = [...newStages[targetStageId].items, item];
                setStages(newStages);
            }
        } catch (error) {
            console.error('Error moving item:', error);
        }
    };

    // Add item handlers
    const handleAddItem = async (stageId) => {
        if (!newItemText.trim()) return;

        const newItem = {
            id: Date.now().toString(),
            content: newItemText,
            stage_id: stageId,
        };

        try {
            const response = await fetch(`http://localhost:8000/boards/${boardId}/items`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newItem),
            });

            if (response.ok) {
                setStages({
                    ...stages,
                    [stageId]: {
                        ...stages[stageId],
                        items: [...stages[stageId].items, newItem],
                    },
                });
                setNewItemText('');
                setAddingToStage(null);
            }
        } catch (error) {
            console.error('Error adding item:', error);
        }
    };

    const handleDeleteItem = async (stageId, itemId) => {
        try {
            const response = await fetch(`http://localhost:8000/boards/${boardId}/items/${itemId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                setStages({
                    ...stages,
                    [stageId]: {
                        ...stages[stageId],
                        items: stages[stageId].items.filter(item => item.id !== itemId),
                    },
                });
            }
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    };

    // Add the missing item click handler
    const handleItemClick = (item) => {
        setSelectedItem(item);
    };

    const handleLogout = () => {
        logout(); // Clear user and token from AuthContext
        navigate('/login'); // Redirect to the login page
    };

    // Update your JSX to include the items section
    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Spiritual Journey Board</h1>
                <div className="flex gap-4">
                    {isCreatingStage ? (
                        <div className="flex gap-2 items-center">
                            <input
                                type="text"
                                value={newStageTitle}
                                onChange={(e) => setNewStageTitle(e.target.value)}
                                placeholder="Enter stage name..."
                                className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={handleCreateStage}
                                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => {
                                    setIsCreatingStage(false);
                                    setNewStageTitle('');
                                }}
                                className="border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsCreatingStage(true)}
                            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors flex items-center gap-2"
                        >
                            + Create Stage
                        </button>
                    )}
                    <button
                        onClick={handleLogout}
                        className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </div>


            <div className="flex space-x-6 overflow-x-auto pb-4">
                {Object.entries(stages).map(([stageId, stage]) => (
                    <div
                        key={stageId}
                        className="flex-shrink-0 w-80"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, stageId)}
                    >
                        <div className="bg-gray-50 rounded-lg shadow-sm">
                            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                                <h2 className="font-semibold text-lg text-gray-700">{stage.title}</h2>
                                <button
                                    onClick={() => handleDeleteStage(stageId)}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="p-4 min-h-[calc(100vh-300px)] bg-gray-50">
                                {stage.items?.map((item) => (
                                    <div
                                        key={item.id}
                                        draggable
                                        onClick={() => handleItemClick(item)}
                                        onDragStart={(e) => handleDragStart(e, stageId, item)}
                                        onDragEnd={handleDragEnd}
                                        className="mb-3 bg-white rounded-lg p-3 shadow-sm cursor-move hover:shadow-md transition-shadow border border-gray-100"
                                    >
                                        <div className="flex justify-between items-start">
                                            <p className="text-gray-700">{item.content}</p>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteItem(stageId, item.id);
                                                }}
                                                className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {addingToStage === stageId ? (
                                    <div className="mt-2">
                                        <input
                                            type="text"
                                            value={newItemText}
                                            onChange={(e) => setNewItemText(e.target.value)}
                                            placeholder="Enter item text..."
                                            className="w-full p-2 border rounded mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => handleAddItem(stageId)}
                                                className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600 transition-colors"
                                            >
                                                Add
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setAddingToStage(null);
                                                    setNewItemText('');
                                                }}
                                                className="border border-gray-300 px-4 py-1 rounded hover:bg-gray-50 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setAddingToStage(stageId)}
                                        className="w-full mt-2 py-2 border border-gray-200 rounded flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                                    >
                                        + Add Item
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {selectedItem && (
                <ItemDetailModal
                    item={selectedItem}
                    isOpen={!!selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onUpdate={handleItemUpdate}
                />
            )}
        </div>
    );
};

export default KanbanBoard;