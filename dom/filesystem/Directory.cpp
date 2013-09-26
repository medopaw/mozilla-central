/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Directory.h"
#include "mozilla/dom/FilesystemBinding.h"
#include "nsXULAppAPI.h"
#include "nsWeakReference.h"
#include "Filesystem.h"
#include "CallbackHandler.h"

namespace mozilla {
namespace dom {
namespace filesystem {

NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE_0(Directory)
NS_IMPL_CYCLE_COLLECTING_ADDREF(Directory)
NS_IMPL_CYCLE_COLLECTING_RELEASE(Directory)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(Directory)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

Directory::Directory(Filesystem* aFilesystem,
                     const nsAString& aPath,
                     const nsAString& aName)
  : mFilesystem(do_GetWeakReference(aFilesystem)),
    mPath(aPath),
    mName(aName)
{
  SetIsDOMBinding();
}

Directory::~Directory()
{
}

Directory*
Directory::GetParentObject() const
{
  return nullptr;
}

JSObject*
Directory::WrapObject(JSContext* aCx, JS::Handle<JSObject*> aScope)
{
  return DirectoryBinding::Wrap(aCx, aScope, this);
}

already_AddRefed<Filesystem>
Directory::GetFilesystem()
{
  nsCOMPtr<Filesystem> filesystem = do_QueryReferent(mFilesystem);
  return filesystem.forget();
}

void
Directory::GetName(nsString& retval) const
{
  retval = mName;
}

already_AddRefed<Promise>
Directory::CreateDirectory(const nsAString& path, ErrorResult& aRv)
{
  nsRefPtr<Promise> promise = new Promise(GetFilesystem().get()->GetWindow());
  nsRefPtr<CallbackHandler> callbackHandler =
    new CallbackHandler(GetFilesystem().get(), promise, aRv);
  if (XRE_GetProcessType() == GeckoProcessType_Default) {
  } else {
    /*nsRefPtr<filesystem::FilesystemEvent> r = new filesystem::FilesystemEvent(
      new CreateDirectoryWorker(path, new FileInfoResult(FilesystemResultType::Directory)),
      callbackHandler);
    r->start();*/
  }
  return promise.forget();
}

} // namespace filesystem
} // namespace dom
} // namespace mozilla
