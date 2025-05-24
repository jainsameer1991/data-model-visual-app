package com.example.datamodel.controller;

import com.example.datamodel.service.OpenAIService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/ai")
public class AIController {

    @Autowired
    private OpenAIService openAIService;

    @PostMapping("/interpret")
    public Mono<ResponseEntity<Object>> interpret(@RequestBody AIRequest request) {
        return openAIService.getAIResponse(request.getMessage())
            .map(response -> {
                try {
                    ObjectMapper mapper = new ObjectMapper();
                    // Try to parse as JSON
                    var node = mapper.readTree(response);
                    if (node.has("error")) {
                        // If error field present, return 429
                        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(node.get("error").asText());
                    }
                    return ResponseEntity.ok(mapper.treeToValue(node, Object.class));
                } catch (Exception e) {
                    // fallback to raw string if parsing fails
                    return ResponseEntity.ok(response);
                }
            });
    }

    public static class AIRequest {
        private String message;
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }
} 