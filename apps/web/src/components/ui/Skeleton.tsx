'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-white/[0.06]',
        className
      )}
    />
  );
}

export function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-4">
      <Skeleton className="w-12 h-12 rounded-2xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-32 rounded-full" />
        <Skeleton className="h-2.5 w-48 rounded-full" />
      </div>
      <Skeleton className="h-2 w-10 rounded-full" />
    </div>
  );
}

export function MessageSkeleton({ mine = false }: { mine?: boolean }) {
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} mb-4`}>
      {!mine && <Skeleton className="w-8 h-8 rounded-2xl mr-3 flex-shrink-0 self-end" />}
      <div className={`flex flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
        <Skeleton className={`h-10 rounded-3xl ${mine ? 'rounded-br-md' : 'rounded-bl-md'} ${Math.random() > 0.5 ? 'w-48' : 'w-32'}`} />
        <Skeleton className="h-2 w-12 rounded-full" />
      </div>
    </div>
  );
}

export function ChatListSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 7 }).map((_, i) => (
        <ConversationSkeleton key={i} />
      ))}
    </div>
  );
}

export function MessageListSkeleton() {
  return (
    <div className="flex flex-col px-4 py-6 space-y-4">
      <MessageSkeleton mine={false} />
      <MessageSkeleton mine={true} />
      <MessageSkeleton mine={false} />
      <MessageSkeleton mine={true} />
      <MessageSkeleton mine={false} />
      <MessageSkeleton mine={true} />
    </div>
  );
}

export function FeedCardSkeleton() {
  return (
    <div className="rounded-[var(--radius-xl)] border border-white/[0.04] bg-card/40 p-10 space-y-8 mb-10">
      {/* Author row */}
      <div className="flex items-center gap-5">
        <Skeleton className="w-14 h-14 rounded-[22px] flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-36 rounded-full" />
          <Skeleton className="h-3 w-24 rounded-full" />
        </div>
      </div>
      {/* Content lines */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-full rounded-full" />
        <Skeleton className="h-4 w-4/5 rounded-full" />
        <Skeleton className="h-4 w-2/3 rounded-full" />
      </div>
      {/* Action bar */}
      <div className="flex items-center gap-4 pt-4 border-t border-white/[0.04]">
        <Skeleton className="h-9 w-20 rounded-xl" />
        <Skeleton className="h-9 w-20 rounded-xl" />
        <Skeleton className="h-9 w-20 rounded-xl" />
      </div>
    </div>
  );
}

export function FeedListSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 3 }).map((_, i) => <FeedCardSkeleton key={i} />)}
    </div>
  );
}
