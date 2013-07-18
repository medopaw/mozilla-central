/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Directory.h"
#include "mozilla/dom/FileSystemBinding.h"
#include "nsContentUtils.h"

#include "DirectoryReader.h"
#include "FileUtils.h"
#include "Error.h"
#include "Path.h"
#include "Utils.h"

#include "SPCopyAndMoveToEvent.h"
#include "SPGetEntryEvent.h"
#include "SPRemoveEvent.h"
#include "mozilla/dom/ContentChild.h"
#include "SDCardRequestChild.h"

namespace mozilla {
namespace dom {
namespace sdcard {

NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE_0(Directory)

NS_IMPL_CYCLE_COLLECTING_ADDREF(Directory)
NS_IMPL_CYCLE_COLLECTING_RELEASE(Directory)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(Directory)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

Directory::Directory(const FileInfo& aInfo) :
    Entry(aInfo)
{
  SDCARD_LOG("construct Directory with FileInfo struct");
  SetIsDOMBinding();
}

Directory::~Directory()
{
  SDCARD_LOG("destruct Directory");
}

JSObject*
Directory::WrapObject(JSContext* aCx, JS::Handle<JSObject*> aScope)
{
  return DirectoryBinding::Wrap(aCx, aScope, this);
}

already_AddRefed<DirectoryReader>
Directory::CreateReader()
{
  SDCARD_LOG("in Directory.CreateReader()");
  nsRefPtr<DirectoryReader> reader = new DirectoryReader(this);
  return reader.forget();
}

void
Directory::MakeDirectory(const nsAString& name,
  const Optional< OwningNonNull<EntryCallback> >& successCallback,
  const Optional< OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.makeDirectory()");
  // Assign callback nullptr if not passed
  EntryCallback* pSuccessCallback = nullptr;
  ErrorCallback* pErrorCallback = nullptr;
  if (successCallback.WasPassed()) {
    pSuccessCallback = &(successCallback.Value());
  }
  if (errorCallback.WasPassed()) {
    pErrorCallback = &(errorCallback.Value());
  }
  nsRefPtr<Caller> pCaller = new Caller(pSuccessCallback, pErrorCallback);

  // Check if name is valid.
  if (!Path::IsValidName(name)) {
    SDCARD_LOG("Invalid name!");
    pCaller->CallErrorCallback(Error::DOM_ERROR_ENCODING);
    return;
  }

  // Get absolute real path.
  nsString realPath;
  Path::Absolutize(name, mRelpath, realPath);

  if (XRE_GetProcessType() == GeckoProcessType_Default) {
    SDCARD_LOG("in b2g process");
    nsRefPtr<SPGetEntryEvent> r = new SPGetEntryEvent(realPath, true, true,
        false, pCaller);
    r->Start();
  } else {
    SDCARD_LOG("in app process");
    SDCardGetParams params(realPath, true, true, false);
    PSDCardRequestChild* child = new SDCardRequestChild(pCaller);
    ContentChild::GetSingleton()->SendPSDCardRequestConstructor(child, params);
  }
}

void
Directory::Rename(const nsAString& oldName, const nsAString& newName,
  const Optional< OwningNonNull<EntryCallback> >& successCallback,
  const Optional< OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.rename()");
  // Assign callback nullptr if not passed
  EntryCallback* pSuccessCallback = nullptr;
  ErrorCallback* pErrorCallback = nullptr;
  if (successCallback.WasPassed()) {
    pSuccessCallback = &(successCallback.Value());
  }
  if (errorCallback.WasPassed()) {
    pErrorCallback = &(errorCallback.Value());
  }
  nsRefPtr<Caller> pCaller = new Caller(pSuccessCallback, pErrorCallback);

  // Check if names are valid.
  if (!Path::IsValidName(oldName) || !Path::IsValidName(newName)) {
    SDCARD_LOG("Invalid name!");
    pCaller->CallErrorCallback(Error::DOM_ERROR_ENCODING);
    return;
  }

  // Get absolute real path.
  nsString oldPath;
  Path::Absolutize(oldName, mRelpath, oldPath);

  if (XRE_GetProcessType() == GeckoProcessType_Default) {
    SDCARD_LOG("in b2g process");
    nsRefPtr<SPCopyAndMoveToEvent> r = new SPCopyAndMoveToEvent(oldPath,
        mRelpath, newName, false, pCaller);
    r->Start();
  } else {
    SDCARD_LOG("in app process");
    SDCardCopyAndMoveParams params(oldPath, mRelpath, nsString(newName), false);
    PSDCardRequestChild* child = new SDCardRequestChild(pCaller);
    ContentChild::GetSingleton()->SendPSDCardRequestConstructor(child, params);
  }
}

void
Directory::MoveTo(const nsAString& entry, const nsAString& newName,
      const Optional<NonNull<mozilla::dom::sdcard::Directory> >& newParent,
      const Optional<OwningNonNull<EntryCallback> >& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.MoveTo()");

  // Check if name is valid.
  nsString entryRelpath;
  Path::Absolutize(entry, mRelpath, entryRelpath);

  CopyAndMoveTo(entryRelpath, mRelpath, nsString(newName),
      successCallback, errorCallback, false);
}

void
Directory::MoveTo(mozilla::dom::sdcard::Directory& entry, const nsAString& newName,
      const Optional<NonNull<mozilla::dom::sdcard::Directory> >& newParent,
      const Optional<OwningNonNull<EntryCallback> >& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.MoveTo()");
  nsString entryRelpath;
  entry.GetRelpath(entryRelpath);
  CopyAndMoveTo(entryRelpath, mRelpath, nsString(newName),
      successCallback, errorCallback, false);
}

already_AddRefed<mozilla::dom::Future>
Directory::GetFile(const nsAString& path, const FileSystemFlags& options)
{
  SDCARD_LOG("in Directory.GetFile()");
  nsRefPtr<mozilla::dom::Future> future = new mozilla::dom::Future(GetParentObject());
  return future.forget();
  //GetEntry(path, options, successCallback, errorCallback, true);
}

void
Directory::GetDirectory(const nsAString& path,
    const FileSystemFlags& options,
    const Optional<OwningNonNull<EntryCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.GetDirectory()");
  GetEntry(path, options, successCallback, errorCallback, false);
}

void
Directory::RemoveRecursively(VoidCallback& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.RemoveRecursively()");

  ErrorCallback* pErrorCallback = nullptr;
  if (errorCallback.WasPassed()) {
    pErrorCallback = &(errorCallback.Value());
  }
  nsRefPtr<Caller> pCaller = new Caller(&successCallback, pErrorCallback);

  nsString relpath;
  Path::DOMPathToRealPath(mFullPath, relpath);
  if (XRE_GetProcessType() == GeckoProcessType_Default) {
    SDCARD_LOG("in b2g process");
    nsRefPtr<SPRemoveEvent> r = new SPRemoveEvent(relpath, true, pCaller);
    r->Start();
  } else {
    SDCARD_LOG("in app process");
    SDCardRemoveParams params(relpath, true);
    PSDCardRequestChild* child = new SDCardRequestChild(pCaller);
    ContentChild::GetSingleton()->SendPSDCardRequestConstructor(child, params);
  }

}

void
Directory::GetEntry(const nsAString& path, const FileSystemFlags& options,
    const Optional<OwningNonNull<EntryCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback, bool isFile)
{
  SDCARD_LOG("in Directory.GetEntry()");

  // Assign callback nullptr if not passed
  EntryCallback* pSuccessCallback = nullptr;
  ErrorCallback* pErrorCallback = nullptr;
  if (successCallback.WasPassed()) {
    pSuccessCallback = &(successCallback.Value());
  }
  if (errorCallback.WasPassed()) {
    pErrorCallback = &(errorCallback.Value());
  }
  nsRefPtr<Caller> pCaller = new Caller(pSuccessCallback, pErrorCallback);

  // Check if path is valid.
  if (!Path::IsValidPath(path)) {
    SDCARD_LOG("Invalid path!");
    pCaller->CallErrorCallback(Error::DOM_ERROR_ENCODING);
    return;
  }

  // Make sure path is absolute.
  nsString absolutePath;
  Path::Absolutize(path, mFullPath, absolutePath);
  nsString realPath;
  Path::DOMPathToRealPath(absolutePath, realPath);

  if (XRE_GetProcessType() == GeckoProcessType_Default) {
    SDCARD_LOG("in b2g process");
    nsRefPtr<SPGetEntryEvent> r = new SPGetEntryEvent(realPath, options.mCreate,
        options.mExclusive, isFile, pCaller);
    r->Start();
  } else {
    SDCARD_LOG("in app process");
    SDCardGetParams params(realPath, options.mCreate, options.mExclusive,
        isFile);
    PSDCardRequestChild* child = new SDCardRequestChild(pCaller);
    ContentChild::GetSingleton()->SendPSDCardRequestConstructor(child, params);
  }
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
