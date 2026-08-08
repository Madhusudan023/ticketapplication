package com.ticketdesk.attachment.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Security configuration.
 * CORS is handled entirely by the API Gateway — do NOT add CORS here.
 * Adding CORS in both Gateway and the service causes duplicate
 * 'Access-Control-Allow-Origin' headers which browsers reject.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(AbstractHttpConfigurer::disable)   // CORS owned by API Gateway
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/attachments/**", "/actuator/**").permitAll()
                .anyRequest().authenticated()
            );
        return http.build();
    }
}