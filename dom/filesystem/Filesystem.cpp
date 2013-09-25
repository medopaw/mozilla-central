/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Filesystem.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/dom/Promise.h"
#include "mozilla/dom/FilesystemBinding.h"
#include "mozilla/dom/DOMError.h"
#include "mozilla/dom/ContentChild.h"
#include "Directory.h"
#include "FilesystemEvent.h"
#include "GetEntryWorker.h"
#include "Result.h"
#include "FilesystemRequestChild.h"
#include "CallbackHandler.h"
#include "nsXULAppAPI.h"
#include "nsPIDOMWindow.h"
#include "PathManager.h"

namespace mozilla {
namespace dom {
namespace filesystem {

NS_IMPL_ADDREF(Filesystem)
NS_IMPL_RELEASE(Filesystem)

nsRefPtr<Filesystem> Filesystem::sSdcardFilesystem = nullptr;

Filesystem::Filesystem(nsPIDOMWindow* aWindow,
                       const nsAString& aBase)
  : mWindow(aWindow),
    mPathManager(new PathManager(aBase))
{
}

Filesystem::~Filesystem()
{
}

// static
already_AddRefed<Promise>
Filesystem::GetInstance(nsPIDOMWindow* aWindow, const FilesystemParameters& parameters, ErrorResult& aRv)
{

  nsRefPtr<Promise> promise = new Promise(aWindow);
  nsCOMPtr<nsIGlobalObject> globalObject = do_QueryInterface(aWindow);
  if (!globalObject) {
    aRv.Throw(NS_ERROR_FAILURE);
    return nullptr;
  }
  AutoSafeJSContext cx;
  JS::Rooted<JSObject*> global(cx, globalObject->GetGlobalJSObject());

  switch (parameters.mStorage) {

    case StorageType::Temporary:
    case StorageType::Persistent: {
      nsRefPtr<DOMError> domError = new DOMError(nullptr,
                                                 NS_LITERAL_STRING("Not implemented"));
      Optional<JS::Handle<JS::Value> > val(cx,
        OBJECT_TO_JSVAL(domError->WrapObject(cx, global)));
      promise->MaybeReject(cx, val);
      break;
    }

    case StorageType::Sdcard: {
      nsString sdcardPath = NS_LITERAL_STRING("/sdcard");

      if (!sSdcardFilesystem) {
        sSdcardFilesystem = new filesystem::Filesystem(aWindow, sdcardPath);
      }

      nsRefPtr<filesystem::CallbackHandler> callbackHandler =
        new filesystem::CallbackHandler(sSdcardFilesystem, promise, aRv);
      if (XRE_GetProcessType() == GeckoProcessType_Default) {
        nsRefPtr<filesystem::FilesystemEvent> r = new filesystem::FilesystemEvent(
          new GetEntryWorker(sdcardPath, new FileInfoResult(FilesystemResultType::Directory)),
          callbackHandler
        );
        r->Start();
      } else {
        FilesystemEntranceParams params(sdcardPath);
        filesystem::PFilesystemRequestChild* child =
          new filesystem::FilesystemRequestChild(callbackHandler);
        ContentChild::GetSingleton()->SendPFilesystemRequestConstructor(child,
                                                                        params);
      }
      break;
    }

    default: {
      aRv.Throw(NS_ERROR_FAILURE);
      return nullptr;
      break;
    }

  }

  return promise.forget();

}

// static
void
Filesystem::ShutdownAll()
{
  if (sSdcardFilesystem) {
      sSdcardFilesystem->Shutdown();
      sSdcardFilesystem = nullptr;
  }
}

void
Filesystem::Shutdown()
{
  // TODO Cancel all runnables
}

nsPIDOMWindow*
Filesystem::GetWindow()
{
  return mWindow;
}

PathManager*
Filesystem::GetPathManager()
{
  return mPathManager;
}

} // namespace filesystem
} // namespace dom
} // namespace mozilla
