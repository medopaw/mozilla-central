/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "FilesystemRequestParent.h"
#include "Filesystem.h"
// #include "FilesystemEvent.h"
#include "EntranceEvent.h"

namespace mozilla {
namespace dom {
namespace filesystem {

NS_IMPL_ADDREF(FilesystemRequestParent)
NS_IMPL_RELEASE(FilesystemRequestParent)

FilesystemRequestParent::FilesystemRequestParent(const FilesystemParams& aParams) :
    mParams(aParams),
    mMutex("FilesystemRequestParent::mMutex"),
    mActorDestoryed(false),
    mRunnable(nullptr)
{
  MOZ_COUNT_CTOR(FilesystemRequestParent);
}

FilesystemRequestParent::~FilesystemRequestParent()
{
  MOZ_COUNT_DTOR(FilesystemRequestParent);
}

void
FilesystemRequestParent::Dispatch()
{
  switch (mParams.type()) {

    case FilesystemParams::TFilesystemEntranceParams:
    {
      FilesystemEntranceParams p = mParams;
      nsRefPtr<EntranceEvent> r = new filesystem::EntranceEvent(p.basePath(),
                                                                this);
      r->Start();
      break;
    }

    default:
    {
      NS_RUNTIMEABORT("not reached");
      break;
    }

  }
}

void
FilesystemRequestParent::ActorDestroy(ActorDestroyReason)
{

  MutexAutoLock lock(mMutex);
  mActorDestoryed = true;
  if (mRunnable) {
    mRunnable->Cancel();
  }
}

bool
FilesystemRequestParent::SetRunnable(bool aAdd, FilesystemEvent* aRunnable)
{
  MutexAutoLock lock(mMutex);
  if (aAdd) {
    if (mActorDestoryed) {
      return false;
    }
    mRunnable = aRunnable;
    return true;
  } else {
    mRunnable = nullptr;
    return true;
  }
}

} // namespace filesystem
} // namespace dom
} // namespace mozilla
