package com.ticketdesk.dashboard.controller;

import com.ticketdesk.dashboard.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    private final JdbcTemplate jdbc;

    public DashboardController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * GET /api/v1/dashboard/summary
     * Returns total ticket count, counts by status, priority and category.
     */
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSummary() {
        Map<String, Object> summary = new HashMap<>();

        // Total tickets
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM tickets", Long.class);
        summary.put("totalTickets", total == null ? 0 : total);

        // By status
        summary.put("statusCounts",   countByColumn("status"));

        // By priority
        summary.put("priorityCounts", countByColumn("priority"));

        // By category
        summary.put("categoryCounts", countByColumn("category"));

        return ResponseEntity.ok(ApiResponse.success("Dashboard summary retrieved", summary));
    }

    /**
     * GET /api/v1/dashboard/health
     */
    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Map<String, String>>> health() {
        return ResponseEntity.ok(ApiResponse.success("OK", Map.of("status", "UP")));
    }

    // ── Helper ────────────────────────────────────────────────────────────────
    private Map<String, Long> countByColumn(String column) {
        String sql = "SELECT " + column + ", COUNT(*) AS cnt FROM tickets GROUP BY " + column;
        List<Map<String, Object>> rows = jdbc.queryForList(sql);
        Map<String, Long> result = new HashMap<>();
        for (Map<String, Object> row : rows) {
            String key   = String.valueOf(row.get(column));
            Long   count = ((Number) row.get("cnt")).longValue();
            result.put(key, count);
        }
        return result;
    }
}
