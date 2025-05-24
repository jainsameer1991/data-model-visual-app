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
  getBezierPath,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button, Box, TextField, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemButton, ListItemText, IconButton, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useDrop } from 'react-dnd';
import { useDrag } from 'react-dnd';
import StorageIcon from '@mui/icons-material/Storage';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import MemoryIcon from '@mui/icons-material/Memory';
import ApiIcon from '@mui/icons-material/Api';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Popover from '@mui/material/Popover';

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

const COMPONENTS = [
  { type: 'Kafka', label: 'Kafka', icon: <CloudQueueIcon /> },
  { type: 'Flink', label: 'Flink', icon: <MemoryIcon /> },
  { type: 'Spark', label: 'Spark', icon: <MemoryIcon /> },
  { type: 'Redis', label: 'Redis', icon: <StorageIcon /> },
  { type: 'PostgreSQL', label: 'PostgreSQL', icon: <StorageIcon /> },
  { type: 'MySQL', label: 'MySQL', icon: <StorageIcon /> },
  { type: 'MongoDB', label: 'MongoDB', icon: <StorageIcon /> },
  { type: 'S3', label: 'S3', icon: <CloudQueueIcon /> },
  { type: 'REST API', label: 'REST API', icon: <ApiIcon /> },
];

function getIconForType(type) {
  const comp = COMPONENTS.find(c => c.type === type);
  return comp ? comp.icon : null;
}

function PaletteItem({ component }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'COMPONENT',
    item: { component },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));
  return (
    <Box ref={drag} sx={{ opacity: isDragging ? 0.5 : 1, p: 1, m: 1, border: '1px solid #ccc', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1, cursor: 'grab', background: '#fff' }}>
      {component.icon}
      <span>{component.label}</span>
    </Box>
  );
}

function Palette() {
  return (
    <Box sx={{ width: 160, background: '#f7f7f7', p: 1, height: '100vh', overflowY: 'auto', borderRight: '1px solid #eee' }}>
      <Typography variant="h6" sx={{ mb: 1 }}>Palette</Typography>
      {COMPONENTS.map((c) => <PaletteItem key={c.type} component={c} />)}
    </Box>
  );
}

function ChatPanel({ open, onClose, chatMessages, chatInput, setChatInput, onSend, loading }) {
  const chatBoxRef = React.useRef();
  React.useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatMessages, open]);
  return (
    <Box sx={{ width: open ? 320 : 0, transition: 'width 0.3s', background: '#f7f7f7', height: '100vh', borderLeft: '1px solid #eee', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', p: 1, borderBottom: '1px solid #eee' }}>
        <ChatIcon sx={{ mr: 1 }} />
        <Typography variant="h6" sx={{ flex: 1 }}>AI Chat</Typography>
        <Button onClick={onClose} size="small">Close</Button>
      </Box>
      <Box ref={chatBoxRef} sx={{ flex: 1, p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {chatMessages.length === 0 && (
          <Typography variant="body2" color="text.secondary">Type your intentions here and the system will update the architecture accordingly.</Typography>
        )}
        {chatMessages.map((msg, idx) => (
          <Box key={idx} sx={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', background: msg.role === 'user' ? '#1976d2' : '#eee', color: msg.role === 'user' ? '#fff' : '#333', borderRadius: 2, px: 2, py: 1, mb: 0.5, maxWidth: '80%' }}>
            {msg.content}
          </Box>
        ))}
        {loading && (
          <Box sx={{ alignSelf: 'flex-start', color: '#888', fontStyle: 'italic', fontSize: 14 }}>AI is typing...</Box>
        )}
      </Box>
      <Box sx={{ p: 1, borderTop: '1px solid #eee', display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Describe your intention..."
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && chatInput.trim() && !loading) {
              e.preventDefault();
              onSend();
            }
          }}
          multiline
          minRows={1}
          maxRows={4}
          disabled={loading}
        />
        <Button onClick={onSend} disabled={!chatInput.trim() || loading} variant="contained" sx={{ minWidth: 0, px: 2 }}><SendIcon /></Button>
      </Box>
    </Box>
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
      <Handle type="target" position="left" style={{ background: '#1976d2' }} />
      <Handle type="source" position="right" style={{ background: '#1976d2' }} />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        {data.icon}
        {editMode ? (
          <TextField
            value={tempName}
            onChange={e => setTempName(e.target.value)}
            size="small"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
          />
        ) : (
          <span>{data.label}</span>
        )}
        <IconButton size="small" onClick={handleEdit}><EditIcon fontSize="small" /></IconButton>
      </Box>
      <FileUpload nodeId={data.id} onFileUpload={data.onFileUpload} />
      {data.fileName && <div style={{ fontSize: 12, marginTop: 4 }}>📄 {data.fileName}</div>}
    </Box>
  );
};

const nodeTypes = { uploadNode: NodeWithUpload };

function CustomEdge({ id, sourceX, sourceY, targetX, targetY, data, selected, label, onRequestClick, onResponseClick }) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY });
  return (
    <g>
      <path id={id} className="react-flow__edge-path" d={edgePath} markerEnd="url(#arrowclosed)" style={{ stroke: '#1976d2', strokeWidth: 2 }} />
      {/* Edge label (name) */}
      {label && (
        <foreignObject x={labelX - 60} y={labelY - 20} width={120} height={24} style={{ pointerEvents: 'none' }}>
          <Box sx={{ background: '#fff', border: '1px solid #888', borderRadius: 1, px: 1, fontSize: 13, color: '#333', textAlign: 'center', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label}
          </Box>
        </foreignObject>
      )}
      {/* Only show request/response overlays if selected */}
      {selected && data?.requestModel?.name && (
        <foreignObject x={labelX - 60} y={labelY - 40} width={120} height={30} style={{ cursor: 'pointer' }}>
          <Box onClick={e => { e.stopPropagation(); onRequestClick && onRequestClick(); }} sx={{ background: '#fff', border: '1px solid #1976d2', borderRadius: 1, px: 1, fontSize: 12, color: '#1976d2', textAlign: 'center', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ':hover': { bgcolor: '#e3f2fd' } }}>
            {data.requestModel.name}
          </Box>
        </foreignObject>
      )}
      {selected && data?.responseModel?.name && (
        <foreignObject x={labelX - 60} y={labelY + 10} width={120} height={30} style={{ cursor: 'pointer' }}>
          <Box onClick={e => { e.stopPropagation(); onResponseClick && onResponseClick(); }} sx={{ background: '#fff', border: '1px solid #388e3c', borderRadius: 1, px: 1, fontSize: 12, color: '#388e3c', textAlign: 'center', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ':hover': { bgcolor: '#e8f5e9' } }}>
            {data.responseModel.name}
          </Box>
        </foreignObject>
      )}
    </g>
  );
}

const edgeTypes = { custom: CustomEdge };

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
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [jsonModal, setJsonModal] = useState({ open: false, title: '', json: {} });
  const [manualJson, setManualJson] = useState('');
  const [jsonError, setJsonError] = useState('');
  const sampleJsons = [
    `{
  "actions": [
    { "type": "add_node", "label": "UserService", "componentType": "Service" },
    { "type": "add_node", "label": "MyDesk", "componentType": "Service" },
    { "type": "add_node", "label": "Async-Orchestrator", "componentType": "Service" },
    { "type": "add_edge", "source": "Async-Orchestrator", "target": "UserService",
      "label": "user-details",
      "requestModel": { "name": "UserRequest", "json": { "userId": "string" } },
      "responseModel": { "name": "UserResponse", "json": { "user": { "id": "string", "name": "string" } } }
    }
  ]
}`
  ];

  // Auto-save to localStorage
  useEffect(() => {
    const workflow = {
      nodes,
      edges,
      workflowName,
    };
    localStorage.setItem('autoSavedWorkflow', JSON.stringify(workflow));
  }, [nodes, edges, workflowName]);

  // Track unsaved changes
  useEffect(() => {
    if (initialLoad.current) {
      initialLoad.current = false;
      return;
    }
    setHasUnsavedChanges(true);
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

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('autoSavedWorkflow');
    if (saved) {
      const { nodes, edges, workflowName } = JSON.parse(saved);
      setNodes(nodes || []);
      setEdges(edges || []);
      setWorkflowName(workflowName || 'Untitled Workflow');
      setHasUnsavedChanges(false);
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
      setHasUnsavedChanges(false);
    } catch {
      alert('Failed to load workflow');
    }
  }

  async function handleSaveWorkflow() {
    // Strip icon property from each node before saving
    const nodesToSave = nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        icon: undefined // Remove icon
      }
    }));
    // Save edges with request/response models
    const edgesToSave = edges.map(e => ({
      ...e,
      requestModel: e.requestModel,
      responseModel: e.responseModel,
    }));
    const data = JSON.stringify({ nodes: nodesToSave, edges: edgesToSave, workflowName }, null, 2);
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
      // Only delete edge if not focused in input, textarea, or contenteditable
      const active = document.activeElement;
      const isInput = active && (
        active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.isContentEditable
      );
      if (!isInput && (event.key === 'Delete' || event.key === 'Backspace') && selectedEdge) {
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
      // Rehydrate icon property for each node
      const hydratedNodes = (nodes || []).map(node => ({
        ...node,
        data: {
          ...node.data,
          icon: getIconForType(node.data.componentType)
        }
      }));
      setNodes(hydratedNodes);
      // Ensure edges have request/response model fields
      setEdges((edges || []).map(e => ({
        ...e,
        requestModel: e.requestModel || { name: '', json: {} },
        responseModel: e.responseModel || { name: '', json: {} },
      })));
      setFileMap({});
      setFileHandle(null); // Not using File System Access API for uploads
      setLastSavedData(text);
      setHasUnsavedChanges(false);
    } catch {
      alert('Invalid workflow file');
    }
  }

  // DnD drop for React Flow canvas
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'COMPONENT',
    drop: (item, monitor) => {
      const offset = monitor.getClientOffset();
      if (!offset) return;
      const canvasRect = document.getElementById('reactflow-canvas')?.getBoundingClientRect();
      const x = offset.x - (canvasRect?.left || 0);
      const y = offset.y - (canvasRect?.top || 0);
      handleAddNodeFromPalette(item.component, x, y);
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }), []);

  function handleAddNodeFromPalette(component, x, y) {
    const nodeId = getId();
    setNodes((nds) => [
      ...nds,
      {
        id: nodeId,
        type: 'uploadNode',
        position: { x, y },
        data: {
          label: component.label,
          id: nodeId,
          onFileUpload: handleFileUpload,
          fileName: fileMap[nodeId]?.name || '',
          onNameChange: handleNodeNameChange,
          componentType: component.type,
          icon: component.icon,
        },
      },
    ]);
  }

  // Extracted function to apply AI actions, now attached to window for console testing
  function applyAIActions(data) {
    let actions = [];
    if (data && typeof data === 'object' && data.actions) {
      actions = data.actions;
    }
    if (Array.isArray(actions) && actions.length > 0) {
      let labelToId = {};
      nodes.forEach(n => { labelToId[n.data.label] = n.id; });
      let newNodes = [...nodes];
      let newEdges = [...edges];
      actions.forEach(action => {
        if (action.type === 'add_node') {
          if (!labelToId[action.label]) {
            const nodeId = getId();
            labelToId[action.label] = nodeId;
            newNodes.push({
              id: nodeId,
              type: 'uploadNode',
              position: { x: Math.random() * 250, y: Math.random() * 250 },
              data: {
                label: action.label,
                id: nodeId,
                onFileUpload: handleFileUpload,
                fileName: '',
                onNameChange: handleNodeNameChange,
                componentType: action.componentType,
                icon: getIconForType(action.componentType),
              },
            });
          }
        } else if (action.type === 'add_edge') {
          const sourceId = labelToId[action.source];
          const targetId = labelToId[action.target];
          if (sourceId && targetId) {
            if (!newEdges.some(e => e.source === sourceId && e.target === targetId)) {
              newEdges.push({
                id: `e_${sourceId}_${targetId}_${Math.random().toString(36).slice(2,8)}`,
                source: sourceId,
                target: targetId,
                type: 'default',
                markerEnd: 'arrowclosed',
                style: { stroke: '#1976d2', strokeWidth: 2 },
                label: action.label || '',
                requestModel: action.requestModel || { name: '', json: {} },
                responseModel: action.responseModel || { name: '', json: {} },
              });
            }
          }
        }
      });
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }
  // Expose for console testing
  window.applyAIActions = applyAIActions;

  // Send chat message to backend and handle response
  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: 'user', content: chatInput };
    setChatMessages(msgs => [...msgs, userMsg]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/ai/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content })
      });
      const data = await res.json().catch(() => null);
      let aiContent = "[AI Error: Invalid response]";
      let actions = [];
      if (data && typeof data === 'object' && data.actions) {
        aiContent = JSON.stringify(data, null, 2);
        actions = data.actions;
      } else if (typeof data === 'string') {
        aiContent = data;
      }
      // Apply actions to diagram
      applyAIActions(data);
      setChatMessages(msgs => [...msgs, { role: 'ai', content: aiContent }]);
    } catch (err) {
      setChatMessages(msgs => [...msgs, { role: 'ai', content: '[AI Error: ' + err.message + ']' }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw', background: '#f0f2f5' }}>
      <Palette />
      <Box sx={{ flex: 1, position: 'relative' }}>
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
          <Button variant="contained" onClick={() => setChatOpen((v) => !v)}>{chatOpen ? 'Hide AI Chat' : 'Show AI Chat'}</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => applyAIActions({
              actions: [
                { type: "add_node", label: "UserService", componentType: "Service" },
                { type: "add_node", label: "Async-Orchestrator", componentType: "Service" },
                { type: "add_edge", source: "Async-Orchestrator", target: "UserService" }
              ]
            })}
          >
            Test AI Actions
          </Button>
          <Button
            variant="outlined"
            color="info"
            onClick={() => setJsonModal({ open: true, title: '', json: {} })}
          >
            Syntax Overview / Manual JSON
          </Button>
        </Box>
        <div id="reactflow-canvas" ref={drop} style={{ height: '85vh', width: '100%' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges.map(e => ({
              ...e,
              type: 'custom',
              data: {
                ...e.data,
                requestModel: e.requestModel,
                responseModel: e.responseModel,
              },
              label: e.label,
              selected: selectedEdge === e.id,
              onRequestClick: () => setJsonModal({ open: true, title: e.requestModel?.name || 'Request Model', json: e.requestModel?.json || {} }),
              onResponseClick: () => setJsonModal({ open: true, title: e.responseModel?.name || 'Response Model', json: e.responseModel?.json || {} }),
            }))}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            connectionLineStyle={{ stroke: '#1976d2', strokeWidth: 2 }}
            connectionLineType="bezier"
            onEdgeClick={onEdgeClick}
          >
            <MiniMap />
            <Controls />
            <Background />
          </ReactFlow>
          {/* Floating edge editor */}
          <EdgeModelEditor
            edge={edges.find(e => e.id === selectedEdge)}
            onSave={(updated) => {
              setEdges(eds => eds.map(e => e.id === updated.id ? { ...e, ...updated } : e));
              setSelectedEdge(null);
            }}
            onClose={() => setSelectedEdge(null)}
          />
          {/* Request/Response JSON Modal */}
          <Dialog open={jsonModal.open} onClose={() => setJsonModal({ open: false, title: '', json: {} })} maxWidth="sm" fullWidth>
            <DialogTitle>{jsonModal.title}</DialogTitle>
            <DialogContent>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4, fontSize: 14 }}>
                {JSON.stringify(jsonModal.json, null, 2)}
              </pre>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setJsonModal({ open: false, title: '', json: {} })}>Close</Button>
            </DialogActions>
          </Dialog>
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
        <Dialog open={jsonModal.open} onClose={() => { setJsonModal({ open: false, title: '', json: {} }); setJsonError(''); }} maxWidth="md" fullWidth>
          <DialogTitle>Syntax Overview & Manual JSON Input</DialogTitle>
          <DialogContent>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Sample JSONs:</Typography>
            {sampleJsons.map((ex, idx) => (
              <Box key={idx} sx={{ mb: 2, background: '#f5f5f5', p: 2, borderRadius: 1, position: 'relative' }}>
                <pre style={{ margin: 0, fontSize: 14 }}>{ex}</pre>
                <IconButton size="small" sx={{ position: 'absolute', top: 4, right: 4 }} onClick={() => { navigator.clipboard.writeText(ex); }}><ContentCopyIcon fontSize="small" /></IconButton>
              </Box>
            ))}
            <Typography variant="subtitle1" sx={{ mt: 2 }}>Try your own JSON:</Typography>
            <TextField
              value={manualJson}
              onChange={e => { setManualJson(e.target.value); setJsonError(''); }}
              placeholder="Paste or write your JSON here..."
              multiline
              minRows={6}
              maxRows={16}
              fullWidth
              sx={{ mt: 1 }}
              error={!!jsonError}
              helperText={jsonError}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setJsonModal({ open: false })}>Close</Button>
            <Button variant="contained" onClick={() => {
              try {
                const parsed = JSON.parse(manualJson);
                if (!parsed.actions || !Array.isArray(parsed.actions)) {
                  setJsonError('JSON must have an "actions" array.');
                  return;
                }
                setJsonError('');
                setJsonModal({ open: false });
                setManualJson('');
                applyAIActions(parsed);
              } catch (e) {
                setJsonError('Invalid JSON: ' + e.message);
              }
            }}>Submit</Button>
          </DialogActions>
        </Dialog>
      </Box>
      <ChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        chatMessages={chatMessages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        onSend={handleSendChat}
        loading={chatLoading}
      />
    </Box>
  );
}

function EdgeModelEditor({ edge, onSave, onClose }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [requestName, setRequestName] = useState(edge?.requestModel?.name || '');
  const [requestJsonStr, setRequestJsonStr] = useState(JSON.stringify(edge?.requestModel?.json || {}, null, 2));
  const [responseName, setResponseName] = useState(edge?.responseModel?.name || '');
  const [responseJsonStr, setResponseJsonStr] = useState(JSON.stringify(edge?.responseModel?.json || {}, null, 2));
  const [edgeLabel, setEdgeLabel] = useState(edge?.label || '');
  const [jsonError, setJsonError] = useState('');
  useEffect(() => {
    if (edge) {
      setRequestName(edge.requestModel?.name || '');
      setRequestJsonStr(JSON.stringify(edge.requestModel?.json || {}, null, 2));
      setResponseName(edge.responseModel?.name || '');
      setResponseJsonStr(JSON.stringify(edge.responseModel?.json || {}, null, 2));
      setEdgeLabel(edge.label || '');
      setAnchorEl(document.getElementById('reactflow-canvas'));
      setJsonError('');
    } else {
      setAnchorEl(null);
    }
  }, [edge]);
  if (!edge || !anchorEl) return null;
  return (
    <Popover
      open={!!edge}
      anchorEl={anchorEl}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      PaperProps={{ sx: { p: 2, minWidth: 340, maxWidth: 400 } }}
      onClose={onClose}
      style={{ zIndex: 2000 }}
    >
      <Typography variant="h6" sx={{ mb: 1 }}>Edit Edge Models</Typography>
      <TextField
        label="Edge Name"
        value={edgeLabel}
        onChange={e => setEdgeLabel(e.target.value)}
        fullWidth
        sx={{ mb: 1 }}
      />
      <TextField
        label="Request Model Name"
        value={requestName}
        onChange={e => setRequestName(e.target.value)}
        fullWidth
        sx={{ mb: 1 }}
      />
      <TextField
        label="Request Model JSON"
        value={requestJsonStr}
        onChange={e => setRequestJsonStr(e.target.value)}
        fullWidth
        multiline
        minRows={4}
        maxRows={12}
        sx={{ mb: 2 }}
        inputProps={{ style: { fontFamily: 'monospace', whiteSpace: 'pre', fontSize: 14 } }}
        error={!!jsonError}
        helperText={jsonError && 'Invalid request JSON'}
      />
      <TextField
        label="Response Model Name"
        value={responseName}
        onChange={e => setResponseName(e.target.value)}
        fullWidth
        sx={{ mb: 1 }}
      />
      <TextField
        label="Response Model JSON"
        value={responseJsonStr}
        onChange={e => setResponseJsonStr(e.target.value)}
        fullWidth
        multiline
        minRows={4}
        maxRows={12}
        sx={{ mb: 2 }}
        inputProps={{ style: { fontFamily: 'monospace', whiteSpace: 'pre', fontSize: 14 } }}
        error={!!jsonError}
        helperText={jsonError && 'Invalid response JSON'}
      />
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => {
          let req, res;
          try {
            req = requestJsonStr.trim() ? JSON.parse(requestJsonStr) : {};
          } catch {
            setJsonError('Invalid request JSON');
            return;
          }
          try {
            res = responseJsonStr.trim() ? JSON.parse(responseJsonStr) : {};
          } catch {
            setJsonError('Invalid response JSON');
            return;
          }
          setJsonError('');
          onSave({
            ...edge,
            label: edgeLabel,
            requestModel: { name: requestName, json: req },
            responseModel: { name: responseName, json: res },
          });
        }}>Save</Button>
      </Box>
    </Popover>
  );
}
