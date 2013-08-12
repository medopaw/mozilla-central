/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Directory.h"
#include "mozilla/dom/FileSystemBinding.h"
#include "nsContentUtils.h"
// #include "jsfriendapi.h"
// #include "jsapi.h"
// #include "mozilla/dom/DOMJSClass.h"

#include "DirectoryReader.h"
#include "FileUtils.h"
#include "Error.h"
#include "Path.h"
#include "Utils.h"

#include "SPCopyAndMoveToEvent.h"
#include "SPGetEntryEvent.h"
#include "SPRemoveEvent.h"
#include "SPEnumerateEvent.h"
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
Directory::CreateFile(JSContext* cx, const nsAString& path, const CreateFileOptions& options,
  const Optional< OwningNonNull<EntryCallback> >& successCallback,
  const Optional< OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.createFile()");

  // create and truncate will both be true
  bool exclusive;

  switch (options.mIfExists) {
  case CreateIfExistsMode::Truncate:
    SDCARD_LOG("CreateFileOptions.ifExists=truncate");
    exclusive = false;
    break;
  case CreateIfExistsMode::Fail:
    SDCARD_LOG("CreateFileOptions.ifExists=fail");
    exclusive = true;
    break;
  default:
    SDCARD_LOG("Wrong CreateFileOptions.ifExists");
    break;
  }
  // SDCARD_LOG("%s", options.mData);
/*
  if (options.mData.wasPassed()) {
    const JS::Value& val = options.mData.Value();
  }


  if (options.mData.WasPassed()) {
    SDCARD_LOG("CreateFileOptions.data is passed");
    const JS::Value& val = options.mData.Value();
    if (val.isObject()) {
      const JSObject& obj = val.toObject();
      if (obj.is<Directory>()) {

      if (JS_IsArrayBufferObject(obj)) {
      } else if (JS_IsArrayBufferViewObject(obj)) {
      } else { // Temporally assume that it's Blob

      }
    } else if (val.isString()) {
    } else {
      SDCARD_LOG("Wrong type of CreateFileOptions.data");
    }
  }
  // if (JS_IsArrayBufferObject(options.mData)) {
   // js::ArrayBuffer* src = js::ArrayBuffer::fromJSObject(obj);
  // }
*/
  const JS::Value* pContent = options.mData.WasPassed() ?
    &(options.mData.Value()) : nullptr;

  GetEntry(path, true, exclusive, true,
      successCallback, errorCallback,
      true, pContent);
}

void
Directory::CreateDirectory(const nsAString& path,
  const Optional< OwningNonNull<EntryCallback> >& successCallback,
  const Optional< OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.createDirectory()");

  GetEntry(path, true, false, false, successCallback, errorCallback, false);
}

void
Directory::Get(const nsAString& path,
    const Optional<OwningNonNull<EntryCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Get()");
  // Don't need isFile flag.
  GetEntry(path, false, false, false, successCallback, errorCallback);
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
Directory::Move(const nsAString& entry, const nsAString& newName,
      const Optional<NonNull<mozilla::dom::sdcard::Directory> >& newParent,
      const Optional<OwningNonNull<EntryCallback> >& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Move()");

  // Check if name is valid.
  nsString entryRelpath;
  Path::Absolutize(entry, mRelpath, entryRelpath);

  CopyAndMoveTo(entryRelpath, mRelpath, nsString(newName),
      successCallback, errorCallback, false);
}

void
Directory::Move(mozilla::dom::sdcard::Directory& entry, const nsAString& newName,
      const Optional<NonNull<mozilla::dom::sdcard::Directory> >& newParent,
      const Optional<OwningNonNull<EntryCallback> >& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Move()");
  nsString entryRelpath;
  entry.GetRelpath(entryRelpath);
  CopyAndMoveTo(entryRelpath, mRelpath, nsString(newName),
      successCallback, errorCallback, false);
}

void
Directory::Copy(const nsAString& entry, const nsAString& newName,
      const Optional<NonNull<mozilla::dom::sdcard::Directory> >& newParent,
      const Optional<OwningNonNull<EntryCallback> >& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Copy()");

  // Check if name is valid.
  nsString entryRelpath;
  Path::Absolutize(entry, mRelpath, entryRelpath);

  CopyAndMoveTo(entryRelpath, mRelpath, nsString(newName),
      successCallback, errorCallback, true);
}

void
Directory::Copy(mozilla::dom::sdcard::Directory& entry, const nsAString& newName,
      const Optional<NonNull<mozilla::dom::sdcard::Directory> >& newParent,
      const Optional<OwningNonNull<EntryCallback> >& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Copy()");
  nsString entryRelpath;
  entry.GetRelpath(entryRelpath);
  CopyAndMoveTo(entryRelpath, mRelpath, nsString(newName),
      successCallback, errorCallback, true);
}

void
Directory::Enumerate(EntriesCallback& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Enumerate()");

  EnumerateInternal(false, successCallback, errorCallback);
}

void
Directory::EnumerateDeep(EntriesCallback& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.EnumerateDeep()");

  EnumerateInternal(true, successCallback, errorCallback);
}

void
Directory::Remove(const nsAString& entry, VoidCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Remove()");
  RemoveInternal(entry, false, successCallback, errorCallback);
}

void
Directory::Remove(mozilla::dom::sdcard::Directory& entry, VoidCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Remove()");
  nsString entryRelpath;
  entry.GetRelpath(entryRelpath);
  RemoveInternal(entryRelpath, false, successCallback, errorCallback);
}

void
Directory::RemoveDeep(const nsAString& entry, VoidCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.RemoveDeep()");
  RemoveInternal(entry, true, successCallback, errorCallback);
}

void
Directory::RemoveDeep(mozilla::dom::sdcard::Directory& entry, VoidCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.RemoveDeep()");
  nsString entryRelpath;
  entry.GetRelpath(entryRelpath);
  RemoveInternal(entryRelpath, true, successCallback, errorCallback);
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
  GetEntry(path, options.mCreate, options.mExclusive, false,
      successCallback, errorCallback, false);
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
Directory::GetEntry(const nsAString& path, bool aCreate, bool aExclusive, bool aTruncate,
    const Optional<OwningNonNull<EntryCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback, bool isFile,
    const JS::Value* aContent)
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

  // Make sure path is absolute. The parameter path must be a DOM path.
  nsString absolutePath;
  Path::Absolutize(path, mFullPath, absolutePath);
  nsString realPath;
  Path::DOMPathToRealPath(absolutePath, realPath);

  if (XRE_GetProcessType() == GeckoProcessType_Default) {
    SDCARD_LOG("in b2g process");
    nsRefPtr<SPGetEntryEvent> r = new SPGetEntryEvent(realPath,
        aCreate, aExclusive, aTruncate, isFile, pCaller);
    r->Start();
  } else {
    SDCARD_LOG("in app process");
    SDCardGetParams params(realPath, aCreate, aExclusive, aTruncate, isFile);
    PSDCardRequestChild* child = new SDCardRequestChild(pCaller);
    ContentChild::GetSingleton()->SendPSDCardRequestConstructor(child, params);
  }
}

void
Directory::EnumerateInternal(bool aDeep, EntriesCallback& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.EnumerateInternal()");

  ErrorCallback* pErrorCallback = nullptr;
  if (errorCallback.WasPassed()) {
    pErrorCallback = &(errorCallback.Value());
  }
  nsRefPtr<Caller> pCaller = new Caller(&successCallback, pErrorCallback);

  if (XRE_GetProcessType() == GeckoProcessType_Default) {
    SDCARD_LOG("in b2g process");
    nsRefPtr<SPEnumerateEvent> r = new SPEnumerateEvent(mRelpath, aDeep, pCaller);
    r->Start();
  } else {
    SDCARD_LOG("in app process");
    SDCardEnumerateParams params(mRelpath, aDeep);
    PSDCardRequestChild* child = new SDCardRequestChild(pCaller);
    ContentChild::GetSingleton()->SendPSDCardRequestConstructor(child, params);
  }
}

void
Directory::RemoveInternal(const nsAString& path, bool deep, VoidCallback& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.RemoveInternal()");

  ErrorCallback* pErrorCallback = nullptr;
  if (errorCallback.WasPassed()) {
    pErrorCallback = &(errorCallback.Value());
  }
  nsRefPtr<Caller> pCaller = new Caller(&successCallback, pErrorCallback);

  // Check if path is valid.
  if (!Path::IsValidPath(path)) {
    SDCARD_LOG("Invalid path!");
    pCaller->CallErrorCallback(Error::DOM_ERROR_ENCODING);
    return;
  }

  // Make sure path is absolute.
  nsString entryRelpath;
  Path::Absolutize(path, mRelpath, entryRelpath);

  if (XRE_GetProcessType() == GeckoProcessType_Default) {
    SDCARD_LOG("in b2g process");
    nsRefPtr<SPRemoveEvent> r = new SPRemoveEvent(entryRelpath, deep, pCaller);
    r->Start();
  } else {
    SDCARD_LOG("in app process");
    SDCardRemoveParams params(entryRelpath, deep);
    PSDCardRequestChild* child = new SDCardRequestChild(pCaller);
    ContentChild::GetSingleton()->SendPSDCardRequestConstructor(child, params);
  }
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
