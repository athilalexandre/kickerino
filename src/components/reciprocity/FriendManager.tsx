import type React from "react";
import { useState } from "react";
import type { FriendChannel, Platform } from "../../types/reciprocity";
import { Plus, Trash2, Edit2, Check, X, Shield, ShieldOff } from "lucide-react";

interface FriendManagerProps {
  friends: FriendChannel[];
  onAdd: (displayName: string, platform: Platform, username: string, notes?: string) => void;
  onUpdate: (id: string, updates: Partial<FriendChannel>) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

export function FriendManager({
  friends,
  onAdd,
  onUpdate,
  onRemove,
  onClose,
}: FriendManagerProps) {
  const [displayName, setDisplayName] = useState("");
  const [platform, setPlatform] = useState<Platform>("Kick");
  const [username, setUsername] = useState("");
  const [notes, setNotes] = useState("");
  
  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editPlatform, setEditPlatform] = useState<Platform>("Kick");
  const [editUsername, setEditUsername] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !username.trim()) return;
    
    onAdd(displayName, platform, username, notes);
    setDisplayName("");
    setUsername("");
    setNotes("");
  };

  const startEdit = (friend: FriendChannel) => {
    setEditingId(friend.id);
    setEditDisplayName(friend.displayName);
    setEditPlatform(friend.platform);
    setEditUsername(friend.username);
    setEditNotes(friend.notes || "");
  };

  const saveEdit = (id: string) => {
    if (!editDisplayName.trim() || !editUsername.trim()) return;
    onUpdate(id, {
      displayName: editDisplayName,
      platform: editPlatform,
      username: editUsername,
      notes: editNotes,
    });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  return (
    <div className="friend-manager-panel">
      <div className="friend-manager-panel__header">
        <h3>Gerenciar Canais de Amigos</h3>
        <button type="button" className="btn btn--link" onClick={onClose}>
          Voltar ao Painel
        </button>
      </div>

      <div className="friend-manager-grid">
        {/* Left Side: Add Friend */}
        <div className="friend-manager-card">
          <h4>Adicionar Novo Canal</h4>
          <form onSubmit={handleSubmit} className="friend-manager-form">
            <div className="form-group">
              <label htmlFor="displayName">Nome de Exibição / Apelido</label>
              <input
                id="displayName"
                type="text"
                placeholder="Ex: Alan, Baratta, Léo"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="platform">Plataforma</label>
              <select
                id="platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
              >
                <option value="Kick">Kick</option>
                <option value="Twitch">Twitch</option>
                <option value="YouTube">YouTube</option>
                <option value="TikTok">TikTok</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="username">Username no MissXss (sem @)</label>
              <input
                id="username"
                type="text"
                placeholder="Nome exato do usuário no chat"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="notes">Notas / Observações (Opcional)</label>
              <textarea
                id="notes"
                placeholder="Notas sobre o canal..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <button type="submit" className="btn btn--success btn--block">
              <Plus size={16} />
              <span>Adicionar Amigo</span>
            </button>
          </form>
        </div>

        {/* Right Side: List Friends */}
        <div className="friend-manager-card">
          <h4>Canais Cadastrados ({friends.length})</h4>
          {friends.length === 0 ? (
            <div className="friend-manager-empty">
              <p>Nenhum amigo cadastrado ainda.</p>
              <span>Use o formulário ao lado para adicionar seus primeiros amigos.</span>
            </div>
          ) : (
            <div className="friend-manager-list">
              {friends.map((friend) => {
                const isEditing = editingId === friend.id;

                if (isEditing) {
                  return (
                    <div className="friend-manager-item friend-manager-item--editing" key={friend.id}>
                      <div className="form-group">
                        <label>Nome</label>
                        <input
                          type="text"
                          value={editDisplayName}
                          onChange={(e) => setEditDisplayName(e.target.value)}
                        />
                      </div>
                      <div className="form-group-row">
                        <div className="form-group">
                          <label>Plataforma</label>
                          <select
                            value={editPlatform}
                            onChange={(e) => setEditPlatform(e.target.value as Platform)}
                          >
                            <option value="Kick">Kick</option>
                            <option value="Twitch">Twitch</option>
                            <option value="YouTube">YouTube</option>
                            <option value="TikTok">TikTok</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Username</label>
                          <input
                            type="text"
                            value={editUsername}
                            onChange={(e) => setEditUsername(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Notas</label>
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                        />
                      </div>
                      <div className="friend-manager-item__edit-actions">
                        <button
                          type="button"
                          className="btn btn--danger btn--small"
                          onClick={cancelEdit}
                        >
                          <X size={14} />
                          <span>Cancelar</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn--success btn--small"
                          onClick={() => saveEdit(friend.id)}
                        >
                          <Check size={14} />
                          <span>Salvar</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="friend-manager-item" key={friend.id}>
                    <div className="friend-manager-item__info">
                      <div className="info-header">
                        <strong>{friend.displayName}</strong>
                        <span className="platform-tag" data-platform={friend.platform}>
                          {friend.platform}: {friend.username}
                        </span>
                      </div>
                      {friend.notes && <p className="notes">{friend.notes}</p>}
                      <span className="date-added">
                        Adicionado em: {new Date(friend.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="friend-manager-item__actions">
                      <button
                        type="button"
                        className={`action-btn ${friend.enabled ? "action-btn--active" : "action-btn--inactive"}`}
                        onClick={() => onUpdate(friend.id, { enabled: !friend.enabled })}
                        title={friend.enabled ? "Desativar rastreamento" : "Ativar rastreamento"}
                      >
                        {friend.enabled ? <Shield size={16} /> : <ShieldOff size={16} />}
                      </button>

                      <button
                        type="button"
                        className="action-btn"
                        onClick={() => startEdit(friend)}
                        title="Editar detalhes"
                      >
                        <Edit2 size={16} />
                      </button>

                      <button
                        type="button"
                        className="action-btn action-btn--danger"
                        onClick={() => {
                          if (confirm(`Remover ${friend.displayName} do monitoramento?`)) {
                            onRemove(friend.id);
                          }
                        }}
                        title="Deletar canal"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
