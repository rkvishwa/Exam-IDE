import React, { useCallback } from "react";
import { X } from "lucide-react";
import CollaborationPanel from "./CollaborationPanel";
import { useCollaboration } from "../../context/CollaborationContext";
import "./CollaborationModal.css";

interface CollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CollaborationModal({
  isOpen,
  onClose,
}: CollaborationModalProps) {
  const collaboration = useCollaboration();

  const handleSessionStart = useCallback(
    async (mode: "host" | "client", hostIp?: string) => {
      if (mode === "host") {
        await collaboration.startHost();
      } else if (hostIp) {
        await collaboration.joinSession(hostIp);
      }
    },
    [collaboration],
  );

  const handleSessionStop = useCallback(async () => {
    await collaboration.stopSession();
  }, [collaboration]);

  if (!isOpen) return null;

  return (
    <div className="collab-modal-overlay" onClick={onClose}>
      <div className="collab-modal" onClick={(e) => e.stopPropagation()}>
        <div className="collab-modal-header">
          <h2>Collaboration</h2>
          <button className="collab-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="collab-modal-content">
          <CollaborationPanel
            onSessionStart={handleSessionStart}
            onSessionStop={handleSessionStop}
            collaborationStatus={collaboration.status}
          />
        </div>
      </div>
    </div>
  );
}
