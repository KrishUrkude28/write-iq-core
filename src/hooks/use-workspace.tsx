import { createContext, useContext, useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listWorkspaces } from "@/server/workspace.functions";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface WorkspaceContextType {
  activeWorkspaceId: string | null;
  activeWorkspace: Workspace | null;
  setActiveWorkspaceId: (id: string | null) => void;
  workspaces: Workspace[];
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("writeiq_active_workspace");
    }
    return null;
  });
  
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const getWorkspacesFn = useServerFn(listWorkspaces);

  const refresh = async () => {
    try {
      const data = await getWorkspacesFn();
      // Transform data to match local Workspace interface
      const mapped = data.map((ws: any) => ({
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        role: ws.members?.[0]?.role || "member",
      }));
      
      setWorkspaces(mapped);
      
      if (mapped.length > 0) {
        if (!activeWorkspaceId || !mapped.find(w => w.id === activeWorkspaceId)) {
          setActiveWorkspaceId(mapped[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load workspaces:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (activeWorkspaceId) {
      localStorage.setItem("writeiq_active_workspace", activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || null;

  return (
    <WorkspaceContext.Provider 
      value={{ 
        activeWorkspaceId, 
        activeWorkspace,
        setActiveWorkspaceId, 
        workspaces, 
        isLoading,
        refresh 
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
