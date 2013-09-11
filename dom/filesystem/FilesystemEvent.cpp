/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "FilesystemEvent.h"
#include "Filesystem.h"
#include "Worker.h"
#include "FilesystemRequestParent.h"
#include "mozilla/unused.h"
#include "Finisher.h"
#include "Result.h"
#include "Error.h"
#include "Directory.h"

namespace mozilla {
namespace dom {
namespace filesystem {

FilesystemEvent::FilesystemEvent(Filesystem* aFilesystem, Worker* aWorker, Finisher* aFinisher) :
    mFilesystem(aFilesystem),
    mCanceled(false),
    mWorker(aWorker),
    mWorkerThread(nullptr),
    mIPC(false),
    mFinisher(aFinisher),
    mParent(nullptr)
{
}

FilesystemEvent::FilesystemEvent(Filesystem* aFilesystem, Worker* aWorker, FilesystemRequestParent* aParent) :
    mFilesystem(aFilesystem),
    mCanceled(false),
    mWorker(aWorker),
    mWorkerThread(nullptr),
    mIPC(true),
    mFinisher(nullptr),
    mParent(aParent)
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
    // Dispatch itself to main thread
    NS_DispatchToMainThread(this);
  } else {
    // Shutdown mWorkerThread
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
FilesystemEvent::Cancel()
{
  mCanceled = true;
}

void
FilesystemEvent::OnError()
{
  MOZ_ASSERT(mWorker, "mWorker is null!");
  nsString error;
  mWorker->GetError(error);
  if (mIPC) {
    MOZ_ASSERT(mParent, "mParent is null!");
    ErrorResponse response(error);
    unused << mParent->Send__delete__(mParent, response);
  } else {
    MOZ_ASSERT(mFinisher, "mFinisher is null!");
    mFinisher->Fail(error);
  }
}

void
FilesystemEvent::HandleResult()
{
  if (mCanceled) {
    return;
  }
  if (!mWorker->HasError()) {
    OnError();
  }

  Result* result = mWorker->GetResult();
  switch (mWorker->GetResult()->GetType()) {
  case FilesystemResultType::Bool:
    {
      break;
    }
  case FilesystemResultType::Directory:
    {
      const FileInfo& info = (static_cast<FileInfoResult*>(result))->mValue;
      if (!info.isDirectory) {
        mWorker->SetError(Error::DOM_ERROR_TYPE_MISMATCH);
        OnError();
      }
      if (mIPC) {
        DirectoryResponse response(info.relpath, info.name);
        unused << mParent->Send__delete__(mParent, response);
      } else {
        mFinisher->Success(new Directory(mFilesystem, info.relpath, info.name));
      }
      break;
    }
  case FilesystemResultType::DirectoryOrFile:
    {
      break;
    }
  case FilesystemResultType::File:
    {
      break;
    }
  default:
    {
      NS_RUNTIMEABORT("not reached");
      break;
    }
  }

}

} // namespace filesystem
} // namespace dom
} // namespace mozilla
