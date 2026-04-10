'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, ChevronRight, Check, X, ShieldAlert, ArrowUp, ArrowDown } from 'lucide-react';
import clsx from 'clsx';

interface DatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
}

type PickerScreen = 'date' | 'time' | 'confirm';

export default function DatePicker({ isOpen, onClose, onConfirm }: DatePickerProps) {
  const [screen, setScreen] = useState<PickerScreen>('date');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Fix Hydration Mismatch: Initialize with 0 and update via useEffect
  const [hour, setHour] = useState(0);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setHour(now.getHours());
      setMinute(now.getMinutes());
    }
  }, [isOpen]);

  // Dates: Today, +1, +2, +3
  const dates = [0, 1, 2, 3].map(offset => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d;
  });

  const handleDateSelect = (d: Date) => {
    setSelectedDate(d);
    setScreen('time');
  };

  const handleConfirm = () => {
    if (!selectedDate) return;
    const finalDate = new Date(selectedDate);
    finalDate.setHours(hour, minute, 0, 0);
    onConfirm(finalDate);
    setScreen('confirm');
    setTimeout(() => {
      onClose();
      setTimeout(() => setScreen('date'), 300);
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-[#0a0a0f]/95 border border-white/10 rounded-[32px] shadow-2xl overflow-hidden backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-white uppercase tracking-widest">Schedule</h3>
                  <p className="text-[10px] text-white/30 uppercase font-black tracking-[0.2em]">Message Planning</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 text-white/40">
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              <AnimatePresence mode="wait">
                {screen === 'date' ? (
                  <motion.div
                    key="date"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest px-6">Select Date</p>
                    <div className="overflow-x-auto no-scrollbar pb-2">
                       <motion.div 
                         drag="x"
                         dragConstraints={{ left: -300, right: 0 }}
                         className="flex gap-3 px-6 pb-2 cursor-grab active:cursor-grabbing"
                         style={{ width: 'max-content' }}
                       >
                        {dates.map((d, i) => (
                          <button
                            key={i}
                            onClick={() => handleDateSelect(d)}
                            className="w-[150px] p-5 rounded-[24px] bg-white/[0.03] border border-white/5 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all text-left group shrink-0 relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                            <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.2em] mb-1.5 group-hover:text-indigo-400/40 transition-colors">
                              {i === 0 ? 'Priority' : i === 1 ? 'Upcoming' : 'Later'}
                            </p>
                            <p className="text-[10px] font-bold text-indigo-400/60 uppercase mb-1">
                              {i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'long' })}
                            </p>
                            <p className="text-[17px] font-black text-white group-hover:text-indigo-400 transition-colors">
                              {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </button>
                        ))}
                      </motion.div>
                    </div>
                  </motion.div>
                ) : screen === 'time' ? (
                  <motion.div
                    key="time"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Set Time</p>
                      <button 
                        onClick={() => setScreen('date')}
                        className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest hover:underline"
                      >
                        Back to Date
                      </button>
                    </div>

                    {/* MECHANICAL WHEEL SCROLL PICKER */}
                    <div className="flex items-center justify-center gap-6 py-6 bg-white/[0.02] border border-white/5 rounded-[24px]">
                       <TimeWheel value={hour} max={23} onChange={setHour} label="HRS" />
                       <span className="text-3xl font-black text-white/10">:</span>
                       <TimeWheel value={minute} max={59} onChange={setMinute} label="MIN" />
                    </div>

                    <p className="text-center text-[10px] text-white/30 italic">Scheduled for {selectedDate?.toLocaleDateString()} at {hour.toString().padStart(2,'0')}:{minute.toString().padStart(2,'0')}</p>

                    <button
                      onClick={handleConfirm}
                      className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[14px] transition-all shadow-[0_0_30px_rgba(79,70,229,0.3)] active:scale-95 flex items-center justify-center gap-2"
                    >
                      Confirm Schedule
                      <ChevronRight size={18} />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <div className="relative w-20 h-20 mb-6">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-0 rounded-full border-2 border-t-indigo-500 border-r-transparent border-b-indigo-500 border-l-transparent"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check size={32} className="text-emerald-400" />
                      </div>
                    </div>
                    <p className="text-[17px] font-bold text-white mb-2">Message Scheduled</p>
                    <p className="text-[11px] text-white/40 uppercase tracking-widest leading-loose">
                      Protocol: Secure Delivery<br />
                      Status: Queued for transmission
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * High-Fidelity Mechanical Wheel Picker Component
 */
function TimeWheel({ value, max, onChange, label }: { value: number; max: number; onChange: (v: number) => void; label: string }) {
  const numbers = Array.from({ length: max + 1 }, (_, i) => i);
  const ITEM_HEIGHT = 44; // px

  const handlePrev = () => onChange(value === 0 ? max : value - 1);
  const handleNext = () => onChange(value === max ? 0 : value + 1);

  return (
    <div className="flex flex-col items-center gap-2">
      <button onClick={handlePrev} className="p-1 text-white/20 hover:text-indigo-400 transition-colors"><ArrowUp size={14} /></button>
      
      <div className="relative h-[132px] w-16 overflow-hidden flex flex-col items-center px-2">
        {/* Depth Masks */}
        <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-[#0a0a0f] to-transparent z-10 pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-[#0a0a0f] to-transparent z-10 pointer-events-none" />
        
        {/* Selection Glow Indicator */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-10 rounded-lg bg-indigo-500/10 border-y border-indigo-500/20 z-0">
           <motion.div 
             animate={{ opacity: [0.2, 0.5, 0.2] }} 
             transition={{ duration: 2, repeat: Infinity }}
             className="absolute inset-x-0 top-0 h-[1px] bg-indigo-400/30 blur-[2px]" 
           />
        </div>

        <motion.div
          animate={{ y: -(value * ITEM_HEIGHT) + (ITEM_HEIGHT) }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative z-10"
        >
          {numbers.map((n) => {
            const isSelected = n === value;
            return (
              <div
                key={n}
                style={{ height: ITEM_HEIGHT }}
                className={clsx(
                  "flex items-center justify-center transition-all duration-300 select-none",
                  isSelected ? "text-2xl font-black text-white" : "text-sm font-bold text-white/10"
                )}
              >
                {n.toString().padStart(2, '0')}
              </div>
            );
          })}
        </motion.div>
      </div>

      <button onClick={handleNext} className="p-1 text-white/20 hover:text-indigo-400 transition-colors"><ArrowDown size={14} /></button>
      <span className="text-[8px] font-black text-indigo-400/40 uppercase tracking-[0.4em] mt-1">{label}</span>
    </div>
  );
}
