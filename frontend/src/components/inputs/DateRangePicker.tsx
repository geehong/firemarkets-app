import React from 'react';
import DatePicker from '@/components/form/date-picker';

interface DateRangePickerProps {
    numberOfMonths?: number;
    variant?: 'start' | 'end';
    onStartDate?: (date: string | null) => void;
    onEndDate?: (date: string | null) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ numberOfMonths, variant, onStartDate, onEndDate }) => {
    const handleChange = (selectedDates: Date[], dateStr: string) => {
        if (variant === 'start' && onStartDate) {
            onStartDate(dateStr || null);
        } else if (variant === 'end' && onEndDate) {
            onEndDate(dateStr || null);
        }
    };

    const id = `date-picker-${variant}-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <div className="w-40">
            <DatePicker
                id={id}
                mode="single"
                onChange={handleChange}
                placeholder={variant === 'start' ? 'Start Date' : 'End Date'}
                label={variant === 'start' ? 'Start' : 'End'}
            />
        </div>
    );
};

export default DateRangePicker;
