/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include "mozilla/Attributes.h"
#include "mozilla/ErrorResult.h"

#include "nsCycleCollectionParticipant.h"
#include "nsWrapperCache.h"
// #include "mozilla/dom/Promise.h"

#include "Entry.h"

struct JSContext;

namespace mozilla {
namespace dom {

class Promise;

class EntriesCallback;

class CreateFileOptions;
class DestinationDict;
class FileSystemFlags;

class StringOrDirectory;

namespace sdcard {

class Caller;
struct FileInfo;

class Directory MOZ_FINAL : public Entry
{
public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_CLASS(Directory)

public:
  explicit Directory(const FileInfo& aInfo);

  ~Directory();

  virtual JSObject* WrapObject(JSContext* aCx, JS::Handle<JSObject*> aScope);

  // already_AddRefed<DirectoryReader> CreateReader();

  void CreateFile(JSContext* cx, const nsAString& path, const CreateFileOptions& options,
      const Optional< OwningNonNull<EntryCallback> >& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

  void CreateDirectory(const nsAString& path,
      const Optional< OwningNonNull<EntryCallback> >& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

  void Get(const nsAString& path,
      const Optional< OwningNonNull<EntryCallback> >& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);
/*
  void Rename (const nsAString& oldName, const nsAString& newName,
      const Optional< OwningNonNull<EntryCallback> >& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);
*/
  void Move(const StringOrDirectory& path, const nsAString& dest,
      EntryCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback);

  void Move(const StringOrDirectory& path, mozilla::dom::sdcard::Directory& dest,
      EntryCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback);

  void Move(const StringOrDirectory& path, const DestinationDict& dest,
      EntryCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback);

  void Remove(const StringOrDirectory& path, VoidCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback);

  void RemoveDeep(const StringOrDirectory& path, VoidCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback);

  void GetFile(const nsAString& path, const FileSystemFlags& options,
      const Optional< OwningNonNull<EntryCallback> >& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

  already_AddRefed<Promise> GetFile(const nsAString& path,
      const FileSystemFlags& options);

  void GetDirectory(const nsAString& path, const FileSystemFlags& options,
      const Optional< OwningNonNull<EntryCallback> >& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

  void Enumerate (const Optional<nsAString >& path,
      const Optional< OwningNonNull<EntriesCallback> >& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

  void EnumerateDeep (const Optional<nsAString >& path,
      const Optional< OwningNonNull<EntriesCallback> >& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

private:
  bool GetEntryRelpath(const StringOrDirectory& aPath, nsString& aEntryRelpath,
      Caller* aCaller);

  void CopyMoveInternal(const nsAString& aEntryRelpath,
      const nsAString& aParentRelpath, const nsString& aNewName, bool isCopy,
      Caller* aCaller, bool aUndecided = false);

  void GetInternal(const nsAString& aPath, bool aCreate, bool aExclusive,
      bool aTruncate, Caller* aCaller, bool aIsFile = true,
      const JS::Value* aContent = nullptr);

  void EnumerateInternal(const Optional<nsAString >& aPath, bool aDeep,
      Caller* aCaller);

  void RemoveInternal(const nsAString& aEntryRelpath, bool aDeep, Caller* aCaller);
};

} // namespace sdcard
} // namespace dom
} // namespace mozilla
