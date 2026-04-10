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
