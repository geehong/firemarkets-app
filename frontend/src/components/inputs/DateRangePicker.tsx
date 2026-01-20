import React from 'react';
import DatePicker from '@/components/form/date-picker';

interface DateRangePickerProps {
    numberOfMonths?: number;
    variant?: 'start' | 'end';
    onStartDate?: (date: string | null) => void;
    onEndDate?: (date: string | null) => void;
    label?: string; // Add label prop
    placeholder?: string; // Add placeholder prop
    className?: string; // Add className prop
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ numberOfMonths, variant, onStartDate, onEndDate, label, placeholder, className }) => {
    const handleChange = (selectedDates: Date[], dateStr: string) => {
        if (variant === 'start' && onStartDate) {
            onStartDate(dateStr || null);
        } else if (variant === 'end' && onEndDate) {
            onEndDate(dateStr || null);
        }
    };

    const id = `date-picker-${variant}-${Math.random().toString(36).substr(2, 9)}`;

    // Determine label text: use prop if provided (even if empty string), otherwise fallback
    const labelText = label !== undefined ? label : (variant === 'start' ? 'Start' : 'End');
    
    // Determine placeholder text
    const placeholderText = placeholder !== undefined ? placeholder : (variant === 'start' ? 'Start Date' : 'End Date');

    return (
        <div className={`w-40 ${className?.includes('w-') ? '' : 'w-40'}`}>
            <DatePicker
                id={id}
                mode="single"
                onChange={handleChange}
                placeholder={placeholderText}
                label={labelText}
                className={className}
            />
        </div>
    );
};

export default DateRangePicker;
