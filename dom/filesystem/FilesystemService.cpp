/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "FilesystemService.h"
#include "Filesystem.h"
#include "Directory.h"
#include "FilesystemEvent.h"
#include "Worker.h"
#include "Result.h"
#include "FilesystemRequestChild.h"
#include "CallbackHandler.h"
#include "FilesystemRequestParent.h"
#include "Error.h"

#include "nsXULAppAPI.h"
#include "mozilla/dom/Promise.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/dom/FilesystemBinding.h"
#include "mozilla/dom/ContentChild.h"

namespace mozilla {
namespace dom {
namespace filesystem {

StaticAutoPtr<FilesystemService> FilesystemService::sInstance;

FilesystemService::FilesystemService()
  : mIsChild(XRE_GetProcessType() != GeckoProcessType_Default)
{
}

// static
FilesystemService*
FilesystemService::GetSingleton()
{
  if (!sInstance) {
    sInstance = new FilesystemService();
  }
  return sInstance;
}

already_AddRefed<Promise>
FilesystemService::CreateDirectory(Directory* aDir, const nsAString& aPath,
                                   ErrorResult& aRv)
{
  nsRefPtr<Filesystem> f = aDir->GetFilesystem().get();
  nsRefPtr<Promise> promise = new Promise(f->GetWindow());
  nsRefPtr<CallbackHandler> callbackHandler =
    new CallbackHandler(f, promise, aRv);

  nsString realPath;
  if (aDir->GetRealPath(aPath, realPath)) {
    if (mIsChild) {
      FilesystemEntranceParams params(realPath);
      PFilesystemRequestChild* child =
        new FilesystemRequestChild(callbackHandler);
      ContentChild::GetSingleton()->SendPFilesystemRequestConstructor(child,
                                                                      params);
    } else {
      nsRefPtr<FilesystemEvent> r = new FilesystemEvent(
        new Worker(FilesystemWorkType::CreateDirectory, realPath,
        new FileInfoResult(FilesystemResultType::Directory)),
        callbackHandler);
      r->Start();
    }
  } else {
    callbackHandler->Fail(Error::DOM_ERROR_ENCODING);
  }

  return promise.forget();
}

void
FilesystemService::CreateDirectory(const FilesystemParams& aParam,
                FilesystemRequestParent* aParent)
{
  FilesystemCreateDirectoryParams p = aParam;
  nsRefPtr<FilesystemEvent> r = new FilesystemEvent(
    new Worker(FilesystemWorkType::CreateDirectory,
               p.realPath(),
               new FileInfoResult(FilesystemResultType::Directory)),
               aParent);
  r->Start();
}

already_AddRefed<Promise>
FilesystemService::GetEntrance(Filesystem* aFs, ErrorResult& aRv)
{
  nsRefPtr<Promise> promise = new Promise(aFs->GetWindow());

  nsString sdcardPath = NS_LITERAL_STRING("/sdcard");

  nsRefPtr<filesystem::CallbackHandler> callbackHandler =
      new filesystem::CallbackHandler(aFs, promise, aRv);
  if (!mIsChild) {
    nsRefPtr<FilesystemEvent> r = new FilesystemEvent(
        new Worker(FilesystemWorkType::GetEntry, sdcardPath,
            new FileInfoResult(FilesystemResultType::Directory)),
        callbackHandler);
    r->Start();
  } else {
    FilesystemEntranceParams params(sdcardPath);
    PFilesystemRequestChild* child =
        new FilesystemRequestChild(callbackHandler);
    ContentChild::GetSingleton()->SendPFilesystemRequestConstructor(child,
        params);
  }

  return promise.forget();
}

void
FilesystemService::GetEntrance(const FilesystemParams& aParam,
                               FilesystemRequestParent* aParent)
{
  const FilesystemEntranceParams& p = aParam;
  nsRefPtr<FilesystemEvent> r = new filesystem::FilesystemEvent(new Worker(
    FilesystemWorkType::GetEntry, p.basePath(),
    new FileInfoResult(FilesystemResultType::Directory)), aParent);
  r->Start();
}

} // namespace filesystem
} // namespace dom
} // namespace mozilla
