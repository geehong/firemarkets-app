import React, { useCallback, useId } from 'react';
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
    const handleChange = useCallback((selectedDates: Date[], dateStr: string) => {
        if (variant === 'start' && onStartDate) {
            onStartDate(dateStr || null);
        } else if (variant === 'end' && onEndDate) {
            onEndDate(dateStr || null);
        }
    }, [variant, onStartDate, onEndDate]);

    const id = useId();

    // Determine label text: use prop if provided (even if empty string), otherwise fallback
    const labelText = label !== undefined ? label : (variant === 'start' ? 'Start' : 'End');
    
    // Determine placeholder text
    const placeholderText = placeholder !== undefined ? placeholder : (variant === 'start' ? 'Start Date' : 'End Date');

    // w-40 should only be default if no width class is provided
    const hasWidthClass = className?.split(' ').some(cls => cls.startsWith('w-'));
    const widthClass = hasWidthClass ? '' : 'w-40';

    return (
        <div className={`inline-flex ${widthClass}`}>
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
