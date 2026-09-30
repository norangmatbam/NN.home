'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocalList, BOARD_SEED, type Post } from '@/lib/postStore';
import LegacyWritePage from './LegacyWritePage';
import { LongChatEditPage } from './LongChatEditPage';

function EditDispatch({ editPid }: { editPid: string }) {
  const [posts, setPosts, loaded] = useLocalList<Post>('ohome.board.v1', BOARD_SEED);
  if (!loaded) return <section className="page" />;
  const post = posts.find(p => p.id === editPid);
  if (post?.chat) {
    return <LongChatEditPage post={post} posts={posts} setPosts={setPosts} />;
  }
  return <LegacyWritePage />;
}

function RoutedWritePage() {
  const params = useSearchParams();
  const editPid = params.get('edit');
  if (!editPid) return <LegacyWritePage />;
  return <EditDispatch editPid={editPid} />;
}

export default function BoardWritePage() {
  return <Suspense fallback={<section className="page" />}><RoutedWritePage /></Suspense>;
}
