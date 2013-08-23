/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Directory.h"
#include "nsContentUtils.h"
#include "mozilla/dom/FileSystemBinding.h"
#include "jsfriendapi.h"
// #include "jsapi.h"
// #include "jsobj.h"
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
/*
already_AddRefed<DirectoryReader>
Directory::CreateReader()
{
  SDCARD_LOG("in Directory.CreateReader()");
  nsRefPtr<DirectoryReader> reader = new DirectoryReader(this);
  return reader.forget();
}
*/
void
Directory::CreateFile(JSContext* cx, const nsAString& path,
    const CreateFileOptions& options,
    const Optional<OwningNonNull<EntryCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.createFile()");

  // create and truncate will both be true
  bool exclusive;

  switch (options.mIfExists) {
  case CreateIfExistsMode::Truncate:
    SDCARD_LOG("CreateFileOptions.ifExists=truncate")
    ;
    exclusive = false;
    break;
  case CreateIfExistsMode::Fail:
    SDCARD_LOG("CreateFileOptions.ifExists=fail")
    ;
    exclusive = true;
    break;
  default:
    SDCARD_LOG("Wrong CreateFileOptions.ifExists")
    ;
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
   js::ArrayBuffer* src = js::ArrayBuffer::fromJSObject(obj);
   // }
   */
  const JS::Value* pContent =
      options.mData.WasPassed() ?
                                  &(options.mData.Value()) :
                                  nullptr;

  GetInternal(path, true, exclusive, true,
      successCallback, errorCallback,
      true, pContent);
}

void
Directory::CreateDirectory(const nsAString& path,
    const Optional<OwningNonNull<EntryCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.createDirectory()");

  GetInternal(path, true, false, false, successCallback, errorCallback, false);
}

void
Directory::Get(const nsAString& path,
    const Optional<OwningNonNull<EntryCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Get()");
  // Don't need isFile flag.
  GetInternal(path, false, false, false, successCallback, errorCallback);
}

void
Directory::Rename(const nsAString& oldName, const nsAString& newName,
    const Optional<OwningNonNull<EntryCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
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
        mRelpath, newName, false, false, pCaller);
    r->Start();
  } else {
    SDCARD_LOG("in app process");
    SDCardCopyAndMoveParams params(oldPath, mRelpath, nsString(newName), false, false);
    PSDCardRequestChild* child = new SDCardRequestChild(pCaller);
    ContentChild::GetSingleton()->SendPSDCardRequestConstructor(child, params);
  }
}
/*
void
Directory::Move(const nsAString& path, const nsAString& dest,
    const Optional<OwningNonNull<EntryCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Move()");

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
  if (!Path::IsValidPath(path) || !Path::IsValidPath(dest)) {
    SDCARD_LOG("Invalid path!");
    pCaller->CallErrorCallback(Error::DOM_ERROR_ENCODING);
    return;
  }

  // Make sure path is absolute.
  nsString entryRelpath, parentRelpath, newName;
  Path::Absolutize(path, mRelpath, entryRelpath);
  Path::Absolutize(dest, mRelpath, parentRelpath);
  newName.SetIsVoid(true);

  CopyMoveInternal(entryRelpath, parentRelpath, newName, true, successCallback, errorCallback, true);
}

void
Directory::Move(const nsAString& path, mozilla::dom::sdcard::Directory& dest,
    const Optional<OwningNonNull<EntryCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Move()");
}

void
Directory::Move(mozilla::dom::sdcard::Directory& path, const nsAString& dest,
    const Optional<OwningNonNull<EntryCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Move()");
}

void
Directory::Move(mozilla::dom::sdcard::Directory& path, mozilla::dom::sdcard::Directory& dest,
    const Optional<OwningNonNull<EntryCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Move()");
}

void
Directory::Copy(const nsAString& path, const nsAString& dest,
    const Optional<OwningNonNull<EntryCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Copy()");
}

void
Directory::Copy(const nsAString& path, mozilla::dom::sdcard::Directory& dest,
    const Optional<OwningNonNull<EntryCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Copy()");
}

void
Directory::Copy(mozilla::dom::sdcard::Directory& path, const nsAString& dest,
    const Optional<OwningNonNull<EntryCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Copy()");
}

void
Directory::Copy(mozilla::dom::sdcard::Directory& path, mozilla::dom::sdcard::Directory& dest,
    const Optional<OwningNonNull<EntryCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Copy()");
}
*/


void
Directory::Move(const StringOrDirectory& path, const nsAString& dest,
    EntryCallback& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Move()");
}

void
Directory::Move(const StringOrDirectory& path,
      mozilla::dom::sdcard::Directory& dest,
      EntryCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Move()");
}

void
Directory::Move(const StringOrDirectory& path,
      const DestinationDict& dest,
      EntryCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Move()");
}

void
Directory::Copy(const StringOrDirectory& path, const nsAString& dest,
      EntryCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Copy()");
}

void
Directory::Copy(const StringOrDirectory& path,
      mozilla::dom::sdcard::Directory& dest,
      EntryCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Copy()");
}

void
Directory::Copy(const StringOrDirectory& path,
      const DestinationDict& dest,
      EntryCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Copy()");
}

void
Directory::Enumerate(const Optional<nsAString>& path,
    const Optional<OwningNonNull<EntriesCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Enumerate()");

  EnumerateInternal(path, false, successCallback, errorCallback);
}

void
Directory::EnumerateDeep(const Optional<nsAString>& path,
    const Optional<OwningNonNull<EntriesCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.EnumerateDeep()");

  EnumerateInternal(path, true, successCallback, errorCallback);
}

void
Directory::Remove(const nsAString& entry, VoidCallback& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Remove()");
  RemoveInternal(entry, false, successCallback, errorCallback);
}

void
Directory::Remove(mozilla::dom::sdcard::Directory& entry,
    VoidCallback& successCallback,
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
Directory::RemoveDeep(mozilla::dom::sdcard::Directory& entry,
    VoidCallback& successCallback,
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
  nsRefPtr<mozilla::dom::Future> future = new mozilla::dom::Future(
      GetParentObject());
  return future.forget();
  //GetInternal(path, options, successCallback, errorCallback, true);
}

void
Directory::GetDirectory(const nsAString& path,
    const FileSystemFlags& options,
    const Optional<OwningNonNull<EntryCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.GetDirectory()");
  GetInternal(path, options.mCreate, options.mExclusive, false,
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
Directory::CopyMoveInternal(const nsString& entryRelpath,
    const nsString& parentRelpath, const nsString& newName, bool isCopy,
    const Optional<OwningNonNull<EntryCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback,
    bool undecided)
{
  SDCARD_LOG("in Directory.CopyMoveInternal()");

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

  if (XRE_GetProcessType() == GeckoProcessType_Default) {
    SDCARD_LOG("in b2g process");
    nsRefPtr<SPCopyAndMoveToEvent> r = new SPCopyAndMoveToEvent(entryRelpath,
        parentRelpath, newName, isCopy, undecided, pCaller);
    r->Start();
  } else {
    SDCARD_LOG("in app process");
    SDCardCopyAndMoveParams params(entryRelpath, parentRelpath, newName, isCopy, undecided);
    PSDCardRequestChild* child = new SDCardRequestChild(pCaller);
    ContentChild::GetSingleton()->SendPSDCardRequestConstructor(child, params);
  }
}

void
Directory::GetInternal(const nsAString& path, bool aCreate, bool aExclusive,
    bool aTruncate,
    const Optional<OwningNonNull<EntryCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback, bool isFile,
    const JS::Value* aContent)
{
  SDCARD_LOG("in Directory.GetInternal()");

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
Directory::EnumerateInternal(const Optional<nsAString>& path, bool aDeep,
    const Optional<OwningNonNull<EntriesCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.EnumerateInternal()");

  EntriesCallback* pSuccessCallback = nullptr;
  if (successCallback.WasPassed()) {
    pSuccessCallback = &(successCallback.Value());
  }
  ErrorCallback* pErrorCallback = nullptr;
  if (errorCallback.WasPassed()) {
    pErrorCallback = &(errorCallback.Value());
  }
  nsRefPtr<Caller> pCaller = new Caller(pSuccessCallback, pErrorCallback);

  nsString relpath = mRelpath;
  if (path.WasPassed()) {
    nsString strPath;
    strPath = path.Value();
    if (!Path::IsValidPath(strPath)) {
      SDCARD_LOG("Invalid path!");
      pCaller->CallErrorCallback(Error::DOM_ERROR_ENCODING);
      return;
    }
    Path::Absolutize(strPath, mRelpath, relpath);
  }

  if (XRE_GetProcessType() == GeckoProcessType_Default) {
    SDCARD_LOG("in b2g process");
    nsRefPtr<SPEnumerateEvent> r = new SPEnumerateEvent(relpath, aDeep,
        pCaller);
    r->Start();
  } else {
    SDCARD_LOG("in app process");
    SDCardEnumerateParams params(relpath, aDeep);
    PSDCardRequestChild* child = new SDCardRequestChild(pCaller);
    ContentChild::GetSingleton()->SendPSDCardRequestConstructor(child, params);
  }
}

void
Directory::RemoveInternal(const nsAString& path, bool deep,
    VoidCallback& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
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
