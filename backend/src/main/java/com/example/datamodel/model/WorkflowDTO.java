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
} 