# Data Model Visual App

## Overview
This project is a modern diagramming tool inspired by [draw.io](https://draw.io) and [swimlanes.io](https://swimlanes.io), with a unique AI assistant. Users can visually create/edit diagrams or describe their intentions in text, and the AI will update the diagram accordingly.

## Key Features
- **Visual Diagram Editing:** Drag-and-drop nodes, connect them with edges, and edit node/edge properties.
- **AI Chat Assistant:** Describe your intentions in natural language; the AI interprets and updates the diagram.
- **Advanced Edge Modeling:** Each edge can have a request and response model (name + editable JSON), with a floating editor for easy editing.
- **Manual JSON Actions:** Use a modal to input or test JSON actions directly, with syntax overview and examples.
- **Workflow Save/Load:** Save your diagram as a workflow (JSON), load existing workflows, and auto-save progress.
- **Hybrid Workflow:** Freely switch between manual editing, AI-driven, or JSON-based commands.

## Tech Stack
- **Frontend:** React (Vite), React Flow, Material UI
- **Backend:** Spring Boot (Java), OpenAI API integration

## Setup & Usage
1. **Clone the repository:**
   ```sh
   git clone <repo-url>
   cd data-model-visual-app
   ```
2. **Install frontend dependencies:**
   ```sh
   cd frontend
   npm install
   ```
3. **Start the backend:**
   ```sh
   cd ../backend
   mvn spring-boot:run
   ```
4. **Start the frontend:**
   ```sh
   cd ../frontend
   npm run dev
   ```
5. **Open the app:**
   Visit [http://localhost:5173/](http://localhost:5173/) in your browser.

## Notes
- **Do not push build artifacts:** The `backend/target/` directory is ignored via `.gitignore` and should not be committed.
- **AI API Key:** To use the AI assistant, set your OpenAI API key in the backend as required.

## Example: Advanced Edge JSON
```json
{
  "actions": [
    {
      "type": "add_node",
      "label": "UserService",
      "componentType": "Service"
    },
    {
      "type": "add_node",
      "label": "Async-Orchestrator",
      "componentType": "Service"
    },
    {
      "type": "add_edge",
      "source": "Async-Orchestrator",
      "target": "UserService",
      "label": "user-details",
      "requestModel": {
        "name": "UserRequest",
        "json": { "userId": "string" }
      },
      "responseModel": {
        "name": "UserResponse",
        "json": { "user": { "id": "string", "name": "string" } }
      }
    }
  ]
}
```

---
For more details or to contribute, see the code and documentation in this repository. 