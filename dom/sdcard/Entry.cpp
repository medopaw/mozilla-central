/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Entry.h"
#include "nsContentUtils.h"
#include "Window.h"
#include "Path.h"
#include "FileUtils.h"
#include "Utils.h"
#include "FileSystem.h"
#include "Metadata.h"
#include "FileEntry.h"
#include "Directory.h"

#include "SPCopyAndMoveToEvent.h"
#include "SPGetMetadataEvent.h"
#include "SPGetParentEvent.h"
#include "SPRemoveEvent.h"
#include "mozilla/dom/ContentChild.h"
#include "SDCardRequestChild.h"

namespace mozilla {
namespace dom {
namespace sdcard {

NS_IMPL_ADDREF(Entry)
NS_IMPL_RELEASE(Entry)
NS_INTERFACE_MAP_BEGIN(Entry)
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

Entry*
Entry::CreateFromRelpath(const nsAString& aPath)
{
  SDCARD_LOG("in Entry::CreateFromRelpath() with relpath=%s", NS_ConvertUTF16toUTF8(aPath).get());

  FileInfo info;
  nsresult rv = FileUtils::GetFileInfo(aPath, info);
  if (NS_FAILED(rv) ) {
    SDCARD_LOG("Fail to create FileInfo from path.");
    return nullptr;
  }
  if (info.isFile) {
    return new FileEntry(info);
  } else {
    return new Directory(info);
  }
}

Entry::Entry(const FileInfo& aInfo) :
    mIsFile(aInfo.isFile),
    mIsDirectory(aInfo.isDirectory),
    mName(aInfo.name),
    mFullPath(aInfo.fullPath)
{
  SDCARD_LOG("construct Entry with FileInfo struct");
  Path::DOMPathToRealPath(mFullPath, mRelpath);
}

Entry::~Entry()
{
  SDCARD_LOG("destruct Entry");
}

nsPIDOMWindow*
Entry::GetParentObject() const
{
  return Window::GetWindow();
}

bool
Entry::IsFile() const
{
  return mIsFile;
}

bool
Entry::IsDirectory() const
{
  return mIsDirectory;
}

void
Entry::GetMetadata(MetadataCallback& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Entry.GetMetadata()");

  ErrorCallback* pErrorCallback = nullptr;
  if (errorCallback.WasPassed()) {
    pErrorCallback = &(errorCallback.Value());
  }
  nsRefPtr<Caller> pCaller = new Caller(&successCallback, pErrorCallback);

  // Leave read-only access non-ipc to speed up.
  nsRefPtr<SPGetMetadataEvent> r = new SPGetMetadataEvent(mRelpath, pCaller);
  r->Start();
}

void
Entry::GetName(nsString& retval) const
{
  SDCARD_LOG("in Entry.GetName() with name=%s", NS_ConvertUTF16toUTF8(mName).get());
  retval = mName;
}

void
Entry::GetFullPath(nsString& retval) const
{
  SDCARD_LOG("in Entry.GetFullPath() with fullpath=%s", NS_ConvertUTF16toUTF8(mFullPath).get());
  retval = mFullPath;
}

already_AddRefed<FileSystem>
Entry::Filesystem() const
{
  SDCARD_LOG("in Entry.Filesystem()");
  nsRefPtr<FileSystem> filesystem(FileSystem::GetFilesystem());
  return filesystem.forget();
}

void
Entry::MoveTo(Directory& parent, const Optional<nsAString>& newName,
    const Optional<OwningNonNull<EntryCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  CopyAndMoveTo(parent, newName, successCallback, errorCallback, false);
}

void
Entry::CopyTo(Directory& parent, const Optional<nsAString>& newName,
    const Optional<OwningNonNull<EntryCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  CopyAndMoveTo(parent, newName, successCallback, errorCallback, true);
}

void
Entry::CopyAndMoveTo(Directory& parent,
    const Optional<nsAString>& newName,
    const Optional<OwningNonNull<EntryCallback> >& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback,
    bool isCopy)
{
  nsString parentDOMPath, parentRelpath;
  parent.GetFullPath(parentDOMPath);
  parent.GetRelpath(parentRelpath);

  nsString strNewName;
  if (newName.WasPassed()) {
    strNewName = newName.Value();
  } else {
    strNewName.SetIsVoid(true);
  }

  EntryCallback* pSuccessCallback = nullptr;
  if (successCallback.WasPassed()) {
    pSuccessCallback = &(successCallback.Value());
  }
  ErrorCallback* pErrorCallback = nullptr;
  if (errorCallback.WasPassed()) {
    pErrorCallback = &(errorCallback.Value());
  }
  nsRefPtr<Caller> pCaller = new Caller(pSuccessCallback, pErrorCallback);

  if (XRE_GetProcessType() == GeckoProcessType_Default) {
    SDCARD_LOG("in b2g process");
    nsRefPtr<SPCopyAndMoveToEvent> r = new SPCopyAndMoveToEvent(mRelpath,
        parentRelpath, strNewName, isCopy, pCaller);
    r->Start();
  } else {
    SDCARD_LOG("in app process");
    SDCardCopyAndMoveParams params(mRelpath, parentRelpath, strNewName, isCopy);
    PSDCardRequestChild* child = new SDCardRequestChild(pCaller);
    ContentChild::GetSingleton()->SendPSDCardRequestConstructor(child, params);
  }
}

void
Entry::Remove(VoidCallback& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Entry.Remove()");

  ErrorCallback* pErrorCallback = nullptr;
  if (errorCallback.WasPassed()) {
    pErrorCallback = &(errorCallback.Value());
  }
  nsRefPtr<Caller> pCaller = new Caller(&successCallback, pErrorCallback);

  if (XRE_GetProcessType() == GeckoProcessType_Default) {
    SDCARD_LOG("in b2g process");
    nsRefPtr<SPRemoveEvent> r = new SPRemoveEvent(mRelpath, false, pCaller);
    r->Start();
  } else {
    SDCARD_LOG("in app process");
    SDCardRemoveParams params(mRelpath, false);
    PSDCardRequestChild* child = new SDCardRequestChild(pCaller);
    ContentChild::GetSingleton()->SendPSDCardRequestConstructor(child, params);
  }
}

void
Entry::GetParent(EntryCallback& successCallback,
    const Optional<OwningNonNull<ErrorCallback> >& errorCallback)
{
  SDCARD_LOG("in Entry.GetParent()");

  ErrorCallback* pErrorCallback = nullptr;
  if (errorCallback.WasPassed()) {
    pErrorCallback = &(errorCallback.Value());
  }
  nsRefPtr<Caller> pCaller = new Caller(&successCallback, pErrorCallback);

  // Leave read-only access non-ipc to speed up.
  nsRefPtr<SPGetParentEvent> r = new SPGetParentEvent(mRelpath, pCaller);
  r->Start();
}

bool
Entry::Exists() const
{
  nsString relpath;
  Path::DOMPathToRealPath(mFullPath, relpath);
  bool exists = false;
  FileUtils::Exists(relpath, &exists);
  return exists;
}

bool
Entry::IsRoot() const
{
  nsString path;
  GetFullPath(path);
  return Path::IsRoot(path);
}

void
Entry::GetRelpath(nsString& retval) const
{
  SDCARD_LOG("in Entry.GetRelPath() with relpath=%s", NS_ConvertUTF16toUTF8(mRelpath).get());
  retval = mRelpath;
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
