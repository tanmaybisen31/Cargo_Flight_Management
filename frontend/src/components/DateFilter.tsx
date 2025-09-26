import { useState } from "react";
import { Box, Card, CardContent, Typography, Button } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { CalendarToday, FilterList, Clear } from "@mui/icons-material";

interface DateFilterProps {
  selectedDate: Dayjs | null;
  onDateChange: (date: Dayjs | null) => void;
  onClearFilter: () => void;
}

export function DateFilter({ selectedDate, onDateChange, onClearFilter }: DateFilterProps) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CalendarToday sx={{ color: "#5D688A" }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#5D688A" }}>
                Date Filter
              </Typography>
            </Box>
            
            <DatePicker
              label="Select Date"
              value={selectedDate}
              onChange={onDateChange}
              sx={{ 
                minWidth: 200,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#5D688A",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#5D688A",
                  }
                }
              }}
            />
            
            {selectedDate && (
              <Button
                variant="outlined"
                startIcon={<Clear />}
                onClick={onClearFilter}
                sx={{
                  borderRadius: 2,
                  borderColor: "#5D688A",
                  color: "#5D688A",
                  "&:hover": {
                    borderColor: "#4a5578",
                    backgroundColor: "rgba(93, 104, 138, 0.04)"
                  }
                }}
              >
                Clear Filter
              </Button>
            )}
            
            <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
              <FilterList sx={{ color: "#5D688A", fontSize: 20 }} />
              <Typography variant="body2" color="text.secondary">
                {selectedDate 
                  ? `Showing data for ${selectedDate.format("MMM DD, YYYY")}`
                  : "Showing all data"
                }
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </LocalizationProvider>
  );
}