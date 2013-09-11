/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "FilesystemEvent.h"
#include "Worker.h"

namespace mozilla {
namespace dom {
namespace filesystem {

FilesystemEvent::FilesystemEvent(Worker* aWorker) :
    mCanceled(false),
    mWorker(aWorker),
    mWorkerThread(nullptr)
{
}

FilesystemEvent::~FilesystemEvent()
{
}

void
FilesystemEvent::Start()
{
  MOZ_ASSERT(NS_IsMainThread(), "Only call on main thread!");

  // run worker thread
  if (!mWorkerThread) {
    nsresult rv = NS_NewThread(getter_AddRefs(mWorkerThread));
    if (NS_FAILED(rv) ) {
      mWorkerThread = nullptr;
      // call error callback
      mWorker->SetError(rv);
      HandleResult();
      return;
    }
  }
  mWorkerThread->Dispatch(this, NS_DISPATCH_NORMAL);
}

NS_IMETHODIMP
FilesystemEvent::Run()
{
  if (!NS_IsMainThread()) {
    if (mWorker->Init()) {
      // Run worker thread tasks: file operations
      if (!mCanceled) {
        mWorker->Work();
      }
    }
    // dispatch itself to main thread
    NS_DispatchToMainThread(this);
  } else {
    // shutdown mWorkerThread
    if (mWorkerThread) {
      mWorkerThread->Shutdown();
    }
    mWorkerThread = nullptr;
    // Run main thread tasks: call callbacks
    HandleResult();
  }

  return NS_OK;
}

void
FilesystemEvent::HandleResult()
{
  if (!mCanceled) {
    mWorker->mErrorName.IsEmpty() ? OnSuccess() : OnError();
  }
}

void
FilesystemEvent::Cancel()
{
  mCanceled = true;
}

} // namespace filesystem
} // namespace dom
} // namespace mozilla
