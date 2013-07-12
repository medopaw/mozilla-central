/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

interface FileSystem {
    readonly attribute DOMString      name;
    readonly attribute Directory root;
};

interface Entry {
    readonly  attribute boolean    isFile;
    readonly  attribute boolean    isDirectory;
    void      getMetadata (MetadataCallback successCallback, optional ErrorCallback errorCallback);
    readonly  attribute DOMString  name;
    readonly  attribute DOMString  fullPath;
    readonly  attribute FileSystem filesystem;
    void      moveTo (Directory parent, optional DOMString newName, optional EntryCallback successCallback, optional ErrorCallback errorCallback);
    void      copyTo (Directory parent, optional DOMString newName, optional EntryCallback successCallback, optional ErrorCallback errorCallback);
//  DOMString toURL ();
    void      remove (VoidCallback successCallback, optional ErrorCallback errorCallback);
    void      getParent (EntryCallback successCallback, optional ErrorCallback errorCallback);
};

interface Directory : Entry {
    [Creator]
    DirectoryReader createReader ();
    void            makeDirectory (DOMString name, optional EntryCallback successCallback, optional ErrorCallback errorCallback);
    void            rename (DOMString oldName, DOMString newName, optional EntryCallback successCallback, optional ErrorCallback errorCallback);
    // void            moveTo (Entry entry, DOMString newName, optional Directory newParent, optional EntryCallback successCallback, optional ErrorCallback errorCallback);
    void            getFile (DOMString path, optional FileSystemFlags options, optional EntryCallback successCallback, optional ErrorCallback errorCallback);
    void            getDirectory (DOMString path, optional FileSystemFlags options, optional EntryCallback successCallback, optional ErrorCallback errorCallback);
    void            removeRecursively (VoidCallback successCallback, optional ErrorCallback errorCallback);
};

interface FileEntry : Entry {
//    [Creator]
//    void createWriter (FileWriterCallback successCallback, optional ErrorCallback errorCallback);
//    void file (FileCallback successCallback, optional ErrorCallback errorCallback);
};

interface DirectoryReader {
    void readEntries (EntriesCallback successCallback, optional ErrorCallback errorCallback);
};

interface Metadata {
    readonly attribute any                modificationTime;
    readonly attribute unsigned long long size;
};

dictionary FileSystemFlags {
    boolean create = false;
    boolean exclusive = false;
};

callback EntryCallback = void (Entry entry);

callback EntriesCallback = void (sequence<Entry> entries);

callback MetadataCallback = void (Metadata metadata);

// callback FileWriterCallback = void (FileWriter fileWriter);

// callback FileCallback = void (File file);

callback VoidCallback = void ();

callback ErrorCallback = void (DOMError err);
