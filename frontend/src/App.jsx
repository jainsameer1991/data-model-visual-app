import React, { useCallback, useState, useEffect, useRef } from 'react';
import ReactFlow, {
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button, Box, TextField, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemButton, ListItemText, IconButton, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

let id = 0;
const getId = () => `node_${id++}`;

function FileUpload({ nodeId, onFileUpload }) {
  const handleChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Upload to backend
      const formData = new FormData();
      formData.append('file', file);
      await fetch(`http://localhost:8080/upload/${nodeId}`, {
        method: 'POST',
        body: formData,
      });
      onFileUpload(nodeId, file);
    }
  };
  return (
    <input type="file" accept="application/json" onChange={handleChange} style={{ marginTop: 8 }} />
  );
}

const NodeWithUpload = ({ data }) => {
  const [editMode, setEditMode] = useState(false);
  const [tempName, setTempName] = useState(data.label);

  const handleEdit = () => setEditMode(true);
  const handleSave = () => {
    data.onNameChange(data.id, tempName);
    setEditMode(false);
  };

  return (
    <Box sx={{ p: 1, background: '#fff', borderRadius: 1, minWidth: 120, textAlign: 'center', boxShadow: 1, position: 'relative' }}>
      {/* React Flow Handles for edge creation */}
      <Handle type="target" position="left" style={{ background: '#1976d2' }} />
      <Handle type="source" position="right" style={{ background: '#1976d2' }} />
      {editMode ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            value={tempName}
            onChange={e => setTempName(e.target.value)}
            size="small"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
          />
          <Button onClick={handleSave} size="small">Save</Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
          <span>{data.label}</span>
          <IconButton size="small" onClick={handleEdit}><EditIcon fontSize="small" /></IconButton>
        </Box>
      )}
      <FileUpload nodeId={data.id} onFileUpload={data.onFileUpload} />
      {data.fileName && <div style={{ fontSize: 12, marginTop: 4 }}>📄 {data.fileName}</div>}
    </Box>
  );
};

const nodeTypes = { uploadNode: NodeWithUpload };

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [fileMap, setFileMap] = useState({});
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [editWorkflowName, setEditWorkflowName] = useState(false);
  const [tempWorkflowName, setTempWorkflowName] = useState(workflowName);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [workflows, setWorkflows] = useState([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const initialLoad = useRef(true);
  const [fileHandle, setFileHandle] = useState(null);
  const [lastSavedData, setLastSavedData] = useState(null);
  const fileInputRef = useRef();
  const [openPending, setOpenPending] = useState(false);

  // Auto-save to localStorage
  useEffect(() => {
    const workflow = {
      nodes,
      edges,
      workflowName,
    };
    localStorage.setItem('autoSavedWorkflow', JSON.stringify(workflow));
  }, [nodes, edges, workflowName]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('autoSavedWorkflow');
    if (saved) {
      const { nodes, edges, workflowName } = JSON.parse(saved);
      setNodes(nodes || []);
      setEdges(edges || []);
      setWorkflowName(workflowName || 'Untitled Workflow');
    }
  }, []);

  // Fetch workflow list when dialog opens
  useEffect(() => {
    if (loadDialogOpen) {
      fetch('http://localhost:8080/workflow/list')
        .then(res => res.json())
        .then(setWorkflows)
        .catch(() => setWorkflows([]));
    }
  }, [loadDialogOpen]);

  // Track unsaved changes
  useEffect(() => {
    if (!initialLoad.current) setHasUnsavedChanges(true);
  }, [nodes, edges, workflowName]);

  // Warn on reload if unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // On mount, check for unsaved changes
  useEffect(() => {
    initialLoad.current = false;
  }, []);

  const onConnect = useCallback(
    (params) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'default',
            markerEnd: 'arrowclosed',
            style: { stroke: '#1976d2', strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const handleAddNode = () => {
    const nodeId = getId();
    setNodes((nds) => [
      ...nds,
      {
        id: nodeId,
        type: 'uploadNode',
        position: { x: Math.random() * 250, y: Math.random() * 250 },
        data: {
          label: `Service ${nodes.length + 1}`,
          id: nodeId,
          onFileUpload: handleFileUpload,
          fileName: fileMap[nodeId]?.name || '',
          onNameChange: handleNodeNameChange,
        },
      },
    ]);
  };

  function handleFileUpload(nodeId, file) {
    setFileMap((prev) => ({ ...prev, [nodeId]: file }));
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, fileName: file.name } }
          : node
      )
    );
  }

  function handleNodeNameChange(nodeId, newName) {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, label: newName } }
          : node
      )
    );
  }

  function handleEditWorkflowName() {
    setTempWorkflowName(workflowName);
    setEditWorkflowName(true);
  }
  function handleSaveWorkflowName() {
    setWorkflowName(tempWorkflowName);
    setEditWorkflowName(false);
  }

  function handleNewWorkflow() {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      setNodes([]);
      setEdges([]);
      setWorkflowName('Untitled Workflow');
      setFileMap({});
      setHasUnsavedChanges(false);
    }
  }

  async function handleLoadWorkflow(name) {
    try {
      const res = await fetch(`http://localhost:8080/workflow/load/${name}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.text();
      const { nodes, edges, workflowName } = JSON.parse(data);
      setWorkflowName(workflowName || name);
      setNodes(nodes || []);
      setEdges(edges || []);
      setFileMap({});
      setLoadDialogOpen(false);
    } catch {
      alert('Failed to load workflow');
    }
  }

  async function handleSaveWorkflow() {
    const data = JSON.stringify({ nodes, edges, workflowName }, null, 2);
    if (fileHandle && window.showSaveFilePicker) {
      // Use File System Access API
      try {
        const writable = await fileHandle.createWritable();
        await writable.write(data);
        await writable.close();
        setLastSavedData(data);
        setHasUnsavedChanges(false);
        alert('Workflow auto-saved!');
        return;
      } catch {
        alert('Failed to save workflow');
      }
    }
    // Prompt for file location
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: workflowName + '.json',
          types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(data);
        await writable.close();
        setFileHandle(handle);
        setLastSavedData(data);
        setHasUnsavedChanges(false);
        alert('Workflow saved!');
        return;
      } catch {
        alert('Save cancelled or failed');
      }
    } else {
      // Fallback: download
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (workflowName || 'workflow') + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setLastSavedData(data);
      setHasUnsavedChanges(false);
      alert('Workflow downloaded!');
    }
  }

  // Auto-save on change if fileHandle is set and data changed
  useEffect(() => {
    if (!fileHandle || !window.showSaveFilePicker) return;
    const data = JSON.stringify({ nodes, edges, workflowName }, null, 2);
    if (lastSavedData && data !== lastSavedData) {
      (async () => {
        try {
          const writable = await fileHandle.createWritable();
          await writable.write(data);
          await writable.close();
          setLastSavedData(data);
          setHasUnsavedChanges(false);
        } catch {}
      })();
    }
    // eslint-disable-next-line
  }, [nodes, edges, workflowName]);

  // Edge selection and deletion
  const onEdgeClick = useCallback((event, edge) => {
    event.stopPropagation();
    setSelectedEdge(edge.id);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedEdge) {
        setEdges((eds) => eds.filter((e) => e.id !== selectedEdge));
        setSelectedEdge(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEdge, setEdges]);

  // Modified Open Workflow: check for unsaved changes
  function handleOpenWorkflow() {
    if (hasUnsavedChanges) {
      setOpenPending(true);
    } else {
      if (fileInputRef.current) fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }

  function proceedOpenWorkflow() {
    setOpenPending(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    fileInputRef.current.click();
  }

  async function handleFileInputChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const { nodes, edges, workflowName } = JSON.parse(text);
      setWorkflowName(workflowName || file.name.replace(/\.json$/, ''));
      setNodes(nodes || []);
      setEdges(edges || []);
      setFileMap({});
      setFileHandle(null); // Not using File System Access API for uploads
      setLastSavedData(text);
      setHasUnsavedChanges(false);
    } catch {
      alert('Invalid workflow file');
    }
  }

  return (
    <Box sx={{ height: '100vh', width: '100vw', background: '#f0f2f5' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, background: '#fff', boxShadow: 1 }}>
        {editWorkflowName ? (
          <>
            <TextField
              value={tempWorkflowName}
              onChange={e => setTempWorkflowName(e.target.value)}
              size="small"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleSaveWorkflowName(); }}
            />
            <Button onClick={handleSaveWorkflowName} size="small">Save</Button>
          </>
        ) : (
          <>
            <span style={{ fontWeight: 'bold', fontSize: 20 }}>{workflowName}</span>
            <IconButton size="small" onClick={handleEditWorkflowName}><EditIcon fontSize="small" /></IconButton>
          </>
        )}
        <Button variant="outlined" onClick={handleNewWorkflow}>New Workflow</Button>
        <Button variant="contained" onClick={handleSaveWorkflow}>Save Workflow</Button>
        <Button variant="contained" onClick={handleAddNode}>Add Service Node</Button>
        <input
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={handleFileInputChange}
        />
        <Button variant="outlined" onClick={handleOpenWorkflow}>Open Workflow</Button>
      </Box>
      <div style={{ height: '85vh', width: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          connectionLineStyle={{ stroke: '#1976d2', strokeWidth: 2 }}
          connectionLineType="bezier"
          onEdgeClick={onEdgeClick}
          edgeStyles={(edge) =>
            edge.id === selectedEdge
              ? { ...edge.style, stroke: '#ff1744', strokeWidth: 3 }
              : edge.style
          }
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
      <Dialog open={loadDialogOpen} onClose={() => setLoadDialogOpen(false)}>
        <DialogTitle>Load Workflow</DialogTitle>
        <DialogContent>
          <List>
            {workflows.map((wf) => (
              <ListItem key={wf} disablePadding>
                <ListItemButton onClick={() => handleLoadWorkflow(wf)}>
                  <ListItemText primary={wf} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoadDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Save Workflow</DialogTitle>
        <DialogContent>
          <TextField
            label="Workflow Name"
            value={saveAsName}
            onChange={e => setSaveAsName(e.target.value)}
            fullWidth
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveWorkflow} disabled={!saveAsName.trim()}>Save</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={showUnsavedDialog} onClose={() => setShowUnsavedDialog(false)}>
        <DialogTitle>Unsaved Changes</DialogTitle>
        <DialogContent>
          <Typography>You have unsaved changes. Do you want to save or discard them?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowUnsavedDialog(false);
            setSaveDialogOpen(true);
            setSaveAsName(workflowName);
          }}>Save</Button>
          <Button onClick={() => {
            setShowUnsavedDialog(false);
            setNodes([]);
            setEdges([]);
            setWorkflowName('Untitled Workflow');
            setFileMap({});
            setHasUnsavedChanges(false);
          }}>Discard</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openPending} onClose={() => setOpenPending(false)}>
        <DialogTitle>Unsaved Changes</DialogTitle>
        <DialogContent>
          <Typography>You have unsaved changes. Do you want to save, discard, or cancel opening a new workflow?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenPending(false); }}>Cancel</Button>
          <Button onClick={() => { setOpenPending(false); setSaveDialogOpen(true); setSaveAsName(workflowName); }}>Save</Button>
          <Button onClick={() => { setOpenPending(false); setHasUnsavedChanges(false); proceedOpenWorkflow(); }}>Discard</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
