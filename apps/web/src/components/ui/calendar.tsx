"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarProps {
  value?: Date;
  onChange?: (date: Date) => void;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function Calendar({
  value = new Date(),
  onChange,
  className,
  minDate,
  maxDate,
  disabled,
}: CalendarProps) {
  const [viewDate, setViewDate] = React.useState(value);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const isSelected = (day: number) => {
    return (
      value.getDate() === day &&
      value.getMonth() === month &&
      value.getFullYear() === year
    );
  };

  const isDisabled = (day: number) => {
    if (disabled) return true;
    const date = new Date(year, month, day);
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  const handleDayClick = (day: number) => {
    if (disabled || isDisabled(day)) return;
    onChange?.(new Date(year, month, day));
  };

  const cells: React.ReactNode[] = [];

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push(
      <button
        key={`prev-${i}`}
        type="button"
        disabled
        className="flex h-9 w-9 items-center justify-center rounded-lg text-xs text-muted-foreground/40"
      >
        {daysInPrevMonth - i}
      </button>,
    );
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(
      <button
        key={day}
        type="button"
        onClick={() => handleDayClick(day)}
        disabled={isDisabled(day)}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-medium transition-colors",
          "hover:bg-accent disabled:cursor-not-allowed disabled:opacity-30",
          isSelected(day) && "bg-primary text-primary-foreground hover:bg-primary",
          isToday(day) && !isSelected(day) && "border border-primary/40",
        )}
      >
        {day}
      </button>,
    );
  }

  // Next month leading days
  const totalCells = cells.length;
  const remainingCells = 42 - totalCells; // 6 rows × 7 days
  for (let i = 1; i <= remainingCells; i++) {
    cells.push(
      <button
        key={`next-${i}`}
        type="button"
        disabled
        className="flex h-9 w-9 items-center justify-center rounded-lg text-xs text-muted-foreground/40"
      >
        {i}
      </button>,
    );
  }

  return (
    <div className={cn("w-fit rounded-xl border bg-card p-3 shadow-float", className)}>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          disabled={disabled}
          className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-accent disabled:opacity-30"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="text-sm font-semibold">
          {MONTHS[month]} {year}
        </div>
        <button
          type="button"
          onClick={nextMonth}
          disabled={disabled}
          className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-accent disabled:opacity-30"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((day) => (
          <div key={day} className="flex h-9 w-9 items-center justify-center text-[10px] font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        {cells}
      </div>
    </div>
  );
}
