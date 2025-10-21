package backend.fitmate.common.dto;

import java.time.LocalDate;

public class TrendDataPoint {
    private String date;
    private Double value;
    
    public TrendDataPoint(LocalDate date, Double value) {
        this.date = date.toString();
        this.value = value;
    }
    
    public TrendDataPoint(String date, Double value) {
        this.date = date;
        this.value = value;
    }
    
    public String getDate() {
        return date;
    }
    
    public void setDate(String date) {
        this.date = date;
    }
    
    public Double getValue() {
        return value;
    }
    
    public void setValue(Double value) {
        this.value = value;
    }
}