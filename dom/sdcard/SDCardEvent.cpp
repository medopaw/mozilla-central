/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SDCardEvent.h"
#include "Worker.h"
#include "Utils.h"

namespace mozilla {
namespace dom {
namespace sdcard {

SDCardEvent::SDCardEvent(Worker* aWorker) :
    mCanceled(false),
    mWorker(aWorker),
    mWorkerThread(nullptr)
{
  SDCARD_LOG("construct SDCardEvent");
}

SDCardEvent::~SDCardEvent()
{
  SDCARD_LOG("destruct SDCardEvent");
}

void
SDCardEvent::Start()
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
SDCardEvent::Run()
{
  if (!NS_IsMainThread()) {
    SDCARD_LOG("SDCardEvent.Run() on worker thread.");
    if (mWorker->Init()) {
      // Run worker thread tasks: file operations
      if (!mCanceled) {
        mWorker->Work();
      } else {
        SDCARD_LOG("Cancel mWorker.Work()");
      }
    }
    // dispatch itself to main thread
    NS_DispatchToMainThread(this);
  } else {
    SDCARD_LOG("SDCardEvent.Run() on main thread.");
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
SDCardEvent::HandleResult()
{
  SDCARD_LOG("in SDCardEvent.HandleResult()");
  if (!mCanceled) {
    mWorker->mErrorName.IsEmpty() ? OnSuccess() : OnError();
  } else {
    SDCARD_LOG("Cancel HandleResult()");
  }
}

void
SDCardEvent::Cancel()
{
  SDCARD_LOG("in SDCardEvent.Cancel() with mCanceled=%d", mCanceled);
  mCanceled = true;
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
