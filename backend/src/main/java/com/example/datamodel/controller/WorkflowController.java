package com.example.datamodel.controller;

import com.example.datamodel.model.WorkflowDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/workflow")
public class WorkflowController {

    private static final String WORKFLOW_DIR = "workflows";

    @PostMapping("/save")
    public ResponseEntity<?> saveWorkflow(@RequestBody WorkflowDTO workflow) {
        try {
            File dir = new File(WORKFLOW_DIR);
            if (!dir.exists()) dir.mkdirs();
            String filePath = WORKFLOW_DIR + "/" + workflow.getName() + ".json";
            try (FileWriter writer = new FileWriter(filePath)) {
                writer.write(workflow.getData());
            }
            return ResponseEntity.ok().body("Workflow saved: " + workflow.getName());
        } catch (IOException e) {
            return ResponseEntity.status(500).body("Save failed: " + e.getMessage());
        }
    }

    @GetMapping("/list")
    public ResponseEntity<?> listWorkflows() {
        File dir = new File(WORKFLOW_DIR);
        if (!dir.exists()) return ResponseEntity.ok(Collections.emptyList());
        String[] files = dir.list((d, name) -> name.endsWith(".json"));
        List<String> names = files == null ? new ArrayList<>() :
                Arrays.stream(files).map(f -> f.replaceAll("\\.json$", "")).collect(Collectors.toList());
        return ResponseEntity.ok(names);
    }

    @GetMapping("/load/{name}")
    public ResponseEntity<?> loadWorkflow(@PathVariable String name) {
        String filePath = WORKFLOW_DIR + "/" + name + ".json";
        try {
            String data = Files.readString(Paths.get(filePath));
            return ResponseEntity.ok(data);
        } catch (IOException e) {
            return ResponseEntity.status(404).body("Workflow not found: " + name);
        }
    }
} 