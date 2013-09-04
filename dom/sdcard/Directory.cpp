/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Directory.h"
#include "nsContentUtils.h"
#include "mozilla/dom/FileSystemBinding.h"
#include "mozilla/dom/UnionTypes.h"
// #include "jsfriendapi.h"
#include "mozilla/dom/Promise.h"
// #include "mozilla/dom/DOMJSClass.h"

#include "DirectoryReader.h"
#include "FileUtils.h"
#include "Window.h"
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
      options.mData.WasPassed() ? &(options.mData.Value()) : nullptr;

  nsRefPtr<Caller> callerPtr = new Caller(successCallback, errorCallback);
  nsString entryRelpath;
  if (!GetEntryRelpath(path, entryRelpath, callerPtr)) {
      return;
  }

  GetInternal(entryRelpath, true, exclusive, true, callerPtr, true, pContent);
}

void
Directory::CreateDirectory(const nsAString& path,
    const Optional<OwningNonNull<EntryCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.createDirectory()");

  nsRefPtr<Caller> callerPtr = new Caller(successCallback, errorCallback);
  nsString entryRelpath;
  if (!GetEntryRelpath(path, entryRelpath, callerPtr)) {
      return;
  }

  GetInternal(entryRelpath, true, false, false, callerPtr, false);
}

void
Directory::Get(const nsAString& path,
    const Optional<OwningNonNull<EntryCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Get()");
  // Don't need isFile flag.
  nsRefPtr<Caller> callerPtr = new Caller(successCallback, errorCallback);
  nsString entryRelpath;
  if (!GetEntryRelpath(path, entryRelpath, callerPtr)) {
      return;
  }

  GetInternal(entryRelpath, false, false, false, callerPtr);
}

void
Directory::Move(const StringOrDirectory& path, const nsAString& dest,
    EntryCallback& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Move()");

  nsRefPtr<Caller> callerPtr = new Caller(successCallback, errorCallback);

  nsString entryRelpath, parentRelpath;
  if (!GetEntryRelpath(path, entryRelpath, callerPtr)
      || !GetEntryRelpath(dest, parentRelpath, callerPtr)) {
    return;
  }

  nsString newName;
  newName.SetIsVoid(true);

  CopyMoveInternal(entryRelpath, parentRelpath, newName, false, callerPtr, true);
}

void
Directory::Move(const StringOrDirectory& path,
      mozilla::dom::sdcard::Directory& dest,
      EntryCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Move()");

  nsRefPtr<Caller> callerPtr = new Caller(successCallback, errorCallback);

  nsString entryRelpath, parentRelpath;
  if (!GetEntryRelpath(path, entryRelpath, callerPtr)
      || !GetEntryRelpath(dest, parentRelpath, callerPtr)) {
    return;
  }

  nsString newName;
  newName.SetIsVoid(true);

  CopyMoveInternal(entryRelpath, parentRelpath, newName, false, callerPtr);
}

void
Directory::Move(const StringOrDirectory& path, const DestinationDict& dest,
      EntryCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Move()");

  nsRefPtr<Caller> callerPtr = new Caller(successCallback, errorCallback);

  nsString entryRelpath;
  if (!GetEntryRelpath(path, entryRelpath, callerPtr)) {
    return;
  }

  nsString parentRelpath;
  if (dest.mDir.WasPassed()) {
    if (!GetEntryRelpath(dest.mDir.Value(), parentRelpath, callerPtr)) {
      return;
    }
  } else {
    parentRelpath = mRelpath;
  }

  nsString newName;
  if (dest.mName.WasPassed()) {
    newName = dest.mName.Value();
    if (!Path::IsValidName(newName)) {
      SDCARD_LOG("Invalid name!");
      callerPtr->CallErrorCallback(Error::DOM_ERROR_ENCODING);
      return;
    }
  } else {
    newName.SetIsVoid(true);
  }

  CopyMoveInternal(entryRelpath, parentRelpath, newName, false, callerPtr);
}
/*
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
*/
void
Directory::Enumerate(const Optional<nsAString>& path,
    const Optional<OwningNonNull<EntriesCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Enumerate()");

  nsRefPtr<Caller> callerPtr = new Caller(successCallback, errorCallback);
  nsString entryRelpath = mRelpath;
  if (path.WasPassed()
      && !GetEntryRelpath(path.Value(), entryRelpath, callerPtr)) {
      return;
  }

  EnumerateInternal(entryRelpath, false, callerPtr);
}

void
Directory::EnumerateDeep(const Optional<nsAString>& path,
    const Optional<OwningNonNull<EntriesCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.EnumerateDeep()");

  nsRefPtr<Caller> callerPtr = new Caller(successCallback, errorCallback);
  nsString entryRelpath = mRelpath;
  if (path.WasPassed()
      && !GetEntryRelpath(path.Value(), entryRelpath, callerPtr)) {
      return;
  }

  EnumerateInternal(entryRelpath, true, callerPtr);
}

void
Directory::Remove(const StringOrDirectory& path, VoidCallback& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.Remove()");

  nsRefPtr<Caller> callerPtr = new Caller(successCallback, errorCallback);
  nsString entryRelpath;
  if (!GetEntryRelpath(path, entryRelpath, callerPtr)) {
    return;
  }
  RemoveInternal(entryRelpath, false, callerPtr);
}

void
Directory::RemoveDeep(const StringOrDirectory& path, VoidCallback& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.RemoveDeep()");

  nsRefPtr<Caller> callerPtr = new Caller(successCallback, errorCallback);
  nsString entryRelpath;
  if (!GetEntryRelpath(path, entryRelpath, callerPtr)) {
    return;
  }
  RemoveInternal(entryRelpath, true, callerPtr);
}

already_AddRefed<Promise>
Directory::GetFile(const nsAString& path, const FileSystemFlags& options, ErrorResult& aRv)
{
  SDCARD_LOG("in Directory.GetFile()");

  nsRefPtr<mozilla::dom::Promise> promise = new Promise(Window::GetWindow());
  return promise.forget();
  //GetInternal(path, options, successCallback, errorCallback, true);
}

void
Directory::GetDirectory(const nsAString& path,
    const FileSystemFlags& options,
    const Optional<OwningNonNull<EntryCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Directory.GetDirectory()");

  nsRefPtr<Caller> callerPtr = new Caller(successCallback, errorCallback);
  GetInternal(path, options.mCreate, options.mExclusive, false, callerPtr, false);
}

bool
Directory::GetEntryRelpath(const nsAString& aPath, nsString& aEntryRelpath,
    Caller* aCaller)
{
  SDCARD_LOG("in Directory.GetEntryRelpath()");

  // Check if path is valid.
  if (!Path::IsValidPath(aPath)) {
    SDCARD_LOG("Invalid path!");
    aCaller->CallErrorCallback(Error::DOM_ERROR_ENCODING);
    return false;
  }

  // Make sure dest is absolute.
  Path::Absolutize(aPath, mRelpath, aEntryRelpath);

  return true;
}

bool
Directory::GetEntryRelpath(const Directory& aPath, nsString& aEntryRelpath,
    Caller* aCaller)
{
  SDCARD_LOG("in Directory.GetEntryRelpath()");

  aPath.GetRelpath(aEntryRelpath);
  if (!Path::IsParentOf(mRelpath, aEntryRelpath)) {
    SDCARD_LOG("Directory is out of scope.");
    aCaller->CallErrorCallback(Error::DOM_ERROR_SECURITY);
    return false;
  }
  return true;
}

bool
Directory::GetEntryRelpath(const StringOrDirectory& aPath, nsString& aEntryRelpath,
    Caller* aCaller)
{
  SDCARD_LOG("in Directory.GetEntryRelpath()");

  if (aPath.IsString()) {
    return GetEntryRelpath(aPath.GetAsString(), aEntryRelpath, aCaller);
  } else if (aPath.IsDirectory()) {
    return GetEntryRelpath(aPath.GetAsDirectory(), aEntryRelpath, aCaller);
  }

  SDCARD_LOG("Type error!");
  aCaller->CallErrorCallback(Error::DOM_ERROR_TYPE_MISMATCH);
  return false;
}

void
Directory::CopyMoveInternal(const nsAString& aEntryRelpath,
    const nsAString& aParentRelpath, const nsString& aNewName, bool aIsCopy,
    Caller* aCaller, bool aUndecided)
{
  SDCARD_LOG("in Directory.CopyMoveInternal()");

  nsString entryRelpath(aEntryRelpath);
  nsString parentRelpath(aParentRelpath);

  if (XRE_GetProcessType() == GeckoProcessType_Default) {
    SDCARD_LOG("in b2g process");
    nsRefPtr<SPCopyAndMoveToEvent> r = new SPCopyAndMoveToEvent(entryRelpath,
        parentRelpath, aNewName, aIsCopy, aUndecided, aCaller);
    r->Start();
  } else {
    SDCARD_LOG("in app process");
    SDCardCopyAndMoveParams params(entryRelpath, parentRelpath, aNewName, aIsCopy, aUndecided);
    PSDCardRequestChild* child = new SDCardRequestChild(aCaller);
    ContentChild::GetSingleton()->SendPSDCardRequestConstructor(child, params);
  }
}

void
Directory::GetInternal(const nsAString& aEntryRelpath, bool aCreate, bool aExclusive,
    bool aTruncate, Caller* aCaller, bool aIsFile, const JS::Value* aContent)
{
  SDCARD_LOG("in Directory.GetInternal()");

  nsString entryRelpath(aEntryRelpath);

  if (XRE_GetProcessType() == GeckoProcessType_Default) {
    SDCARD_LOG("in b2g process");
    nsRefPtr<SPGetEntryEvent> r = new SPGetEntryEvent(entryRelpath,
        aCreate, aExclusive, aTruncate, aIsFile, aCaller);
    r->Start();
  } else {
    SDCARD_LOG("in app process");
    SDCardGetParams params(entryRelpath, aCreate, aExclusive, aTruncate, aIsFile);
    PSDCardRequestChild* child = new SDCardRequestChild(aCaller);
    ContentChild::GetSingleton()->SendPSDCardRequestConstructor(child, params);
  }
}

void
Directory::EnumerateInternal(const nsAString& aEntryRelpath, bool aDeep,
    Caller* aCaller)
{
  SDCARD_LOG("in Directory.EnumerateInternal()");

  nsString entryRelpath(aEntryRelpath);

  if (XRE_GetProcessType() == GeckoProcessType_Default) {
    SDCARD_LOG("in b2g process");
    nsRefPtr<SPEnumerateEvent> r = new SPEnumerateEvent(aEntryRelpath, aDeep,
        aCaller);
    r->Start();
  } else {
    SDCARD_LOG("in app process");
    SDCardEnumerateParams params(entryRelpath, aDeep);
    PSDCardRequestChild* child = new SDCardRequestChild(aCaller);
    ContentChild::GetSingleton()->SendPSDCardRequestConstructor(child, params);
  }
}

void
Directory::RemoveInternal(const nsAString& aEntryRelpath, bool aDeep, Caller* aCaller)
{
  SDCARD_LOG("in Directory.RemoveInternal()");

  nsString entryRelpath(aEntryRelpath);

  if (XRE_GetProcessType() == GeckoProcessType_Default) {
    SDCARD_LOG("in b2g process");
    nsRefPtr<SPRemoveEvent> r = new SPRemoveEvent(entryRelpath, aDeep, aCaller);
    r->Start();
  } else {
    SDCARD_LOG("in app process");
    SDCardRemoveParams params(entryRelpath, aDeep);
    PSDCardRequestChild* child = new SDCardRequestChild(aCaller);
    ContentChild::GetSingleton()->SendPSDCardRequestConstructor(child, params);
  }
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
