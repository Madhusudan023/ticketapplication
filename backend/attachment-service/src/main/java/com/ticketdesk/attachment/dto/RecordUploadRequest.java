package com.ticketdesk.attachment.dto;

public class RecordUploadRequest {
    private Long ticketId;
    private String fileName;
    private String originalFileName;
    private String storageUrl;
    private Long fileSize;
    private String contentType;
    private String eTag;

    public Long getTicketId() { return ticketId; }
    public void setTicketId(Long ticketId) { this.ticketId = ticketId; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getOriginalFileName() { return originalFileName; }
    public void setOriginalFileName(String originalFileName) { this.originalFileName = originalFileName; }

    public String getStorageUrl() { return storageUrl; }
    public void setStorageUrl(String storageUrl) { this.storageUrl = storageUrl; }

    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public String getETag() { return eTag; }
    public void setETag(String eTag) { this.eTag = eTag; }
}
