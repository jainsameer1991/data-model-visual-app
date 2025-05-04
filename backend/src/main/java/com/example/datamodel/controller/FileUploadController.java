package com.example.datamodel.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;

@RestController
@RequestMapping("/upload")
public class FileUploadController {

    @PostMapping("/{nodeId}")
    public ResponseEntity<?> uploadFile(@PathVariable String nodeId, @RequestParam("file") MultipartFile file) {
        try {
            String uploadDir = "uploads";
            File dir = new File(uploadDir);
            if (!dir.exists()) dir.mkdirs();
            String filePath = uploadDir + "/" + nodeId + "-" + file.getOriginalFilename();
            file.transferTo(new File(filePath));
            return ResponseEntity.ok().body("File uploaded for node " + nodeId);
        } catch (IOException e) {
            return ResponseEntity.status(500).body("Upload failed: " + e.getMessage());
        }
    }
} 