/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include "nsThreadUtils.h"

namespace mozilla {
namespace dom {
namespace filesystem {

class Worker;
class Finisher;
class FilesystemRequestParent;

class FilesystemEvent : public nsRunnable
{
public:
  FilesystemEvent(Worker* aWorker, Finisher* aFinisher);
  FilesystemEvent(Worker* aWorker, FilesystemRequestParent* aParent);
  virtual ~FilesystemEvent();

  /*
   * Start the runnable thread.
   * First it calls WorkerThreadRun() to perform worker thread operations.
   * After that it calls MainThreadRun() to perform main thread operations.
   */
  void Start();

  // Overrides nsIRunnable.
  NS_IMETHOD Run() MOZ_OVERRIDE;

  void Cancel();

protected:
  bool mCanceled;

  nsRefPtr<Worker> mWorker;
  void OnSuccess();
  void OnError();

  virtual void HandleResult();

private:
  // Only used on main thread. Don't need a lock.
  nsCOMPtr<nsIThread> mWorkerThread;

  bool mIPC;
  nsRefPtr<Finisher> mFinisher;
  nsRefPtr<FilesystemRequestParent> mParent;
};

} // namespace filesystem
} // namespace dom
} // namespace mozilla
