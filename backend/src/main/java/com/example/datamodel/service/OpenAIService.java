package com.example.datamodel.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import org.springframework.web.reactive.function.client.WebClientResponseException;

@Service
public class OpenAIService {

    private final WebClient webClient;

    public OpenAIService(@Value("${openai.api.key}") String openaiApiKey) {
        this.webClient = WebClient.builder()
                .baseUrl("https://api.openai.com/v1")
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + openaiApiKey)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public Mono<String> getAIResponse(String userMessage) {
        String body = "{\n" +
                "  \"model\": \"gpt-3.5-turbo\",\n" +
                "  \"messages\": [\n" +
                "    {\"role\": \"system\", \"content\": \"You are a diagram assistant. When the user describes a diagram, output only a JSON object with an 'actions' array. Each action is either {type: 'add_node', label: string, componentType: string} or {type: 'add_edge', source: string, target: string}. Use only valid JSON. Example: {\\\"actions\\\":[{\\\"type\\\":\\\"add_node\\\",\\\"label\\\":\\\"A\\\",\\\"componentType\\\":\\\"Kafka\\\"},{\\\"type\\\":\\\"add_edge\\\",\\\"source\\\":\\\"A\\\",\\\"target\\\":\\\"B\\\"}]}\"},\n" +
                "    {\"role\": \"user\", \"content\": \"" + userMessage.replace("\"", "\\\"") + "\"}\n" +
                "  ]\n" +
                "}";

        return webClient.post()
                .uri("/chat/completions")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .onErrorResume(WebClientResponseException.TooManyRequests.class, e ->
                        Mono.just("{\"error\": \"OpenAI rate limit exceeded. Please try again later.\"}")
                );
    }
} 