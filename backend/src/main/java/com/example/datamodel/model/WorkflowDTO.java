package com.example.datamodel.model;

public class WorkflowDTO {
    private String name;
    private String data; // JSON string of the workflow

    public WorkflowDTO() {}

    public WorkflowDTO(String name, String data) {
        this.name = name;
        this.data = data;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getData() { return data; }
    public void setData(String data) { this.data = data; }

    // --- New Models ---
    public static class Edge {
        public String id;
        public String source;
        public String target;
        public String label;
        public RequestModel requestModel;
        public ResponseModel responseModel;
    }

    public static class RequestModel {
        public String id;
        public String name;
        public String json; // JSON string
    }

    public static class ResponseModel {
        public String id;
        public String name;
        public String json; // JSON string
    }
} 