/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include "mozilla/Attributes.h"
#include "mozilla/ErrorResult.h"

// #include "mozilla/dom/FileSystemBinding.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "nsWrapperCache.h"
#include "nsAutoPtr.h"
#include "nsIFile.h"
#include "nsString.h"

class nsPIDOMWindow;
struct JSContext;

namespace mozilla {
namespace dom {

class EntryCallback;
class ErrorCallback;
class MetadataCallback;
class VoidCallback;

// class Optional<OwningNonNull<T> >;

namespace sdcard {

struct FileInfo;
class FileSystem;

class Entry : public nsISupports, public nsWrapperCache
{
public:
  NS_DECL_ISUPPORTS

public:
  // nsIFile to Entry
  static Entry* CreateFromRelpath(const nsAString& aRelpath);

  virtual ~Entry();

  nsPIDOMWindow* GetParentObject() const;

  bool IsFile() const;
  bool IsDirectory() const;

  void GetMetadata(MetadataCallback& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

  void GetName(nsString& retval) const;
  void GetFullPath(nsString& retval) const;

  already_AddRefed<FileSystem> Filesystem() const;
/*
  void MoveTo(Directory& parent,
      const Optional<nsAString >& newName,
      const Optional<OwningNonNull<EntryCallback> >& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback);

  void CopyTo(Directory& parent,
      const Optional<nsAString >& newName,
      const Optional<OwningNonNull<EntryCallback> >& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback);
*/
/*
  void ToURL(nsString& retval);
*/

  void Remove(VoidCallback& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

  void GetParent(EntryCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback);

public:
  bool Exists() const;
  bool IsRoot() const;
  void GetRelpath(nsString& retval) const;

  /*
  nsIFile* GetFileInternal() const
  {
    return mFile;
  }
  */

protected:
  // Protected constructor to prevent direct call.
  explicit Entry(const FileInfo& aInfo);

  bool mIsFile;
  bool mIsDirectory;
  nsString mName;
  nsString mFullPath;
  nsString mRelpath;
/*
  void CopyAndMoveTo(const nsString& entryRelpath,
      const nsString& parentRelpath, const nsString& newName,
      const Optional<OwningNonNull<EntryCallback> >& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback,
      bool isCopy);

private:
  void CopyAndMoveTo(Directory& parent, const Optional<nsAString >& newName,
      const Optional<OwningNonNull<EntryCallback> >& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback,
      bool isCopy);
*/
};

} // namespace sdcard
} // namespace dom
} // namespace mozilla
